const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const models = require('../models');
const { Op } = require('sequelize'); // Import Op
const User = models.User;
const Post = models.Post;
const Follower = models.Follower;
const Wishlist = models.Wishlist;
const TopDestination = models.TopDestination;
const Highlight = models.Highlight;
const UserOtp = models.UserOtp; // Assuming UserOtp is added to models
const apiResponse = require('../utils/apiResponse');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // For generating secure tokens
const s3Util = require('../utils/s3');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.ValidationError(res, errors.array().map(err => err.msg).join(', '));
  }

  const { name, phone, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return apiResponse.ValidationError(res, 'Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      full_name: name,
      phone,
      email,
      password: hashedPassword
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.SECRETKEY || 'default_secret_key',
      { algorithm: 'HS256', expiresIn: '1d' }
    );

    return apiResponse.SuccessResponseWithToken(res, token, 'User registered successfully', {
      id: newUser.id,
      name: newUser.full_name,
      email: newUser.email,
      phone: newUser.phone,
      image: newUser.image,
      is_verified: newUser.is_verified,
      block: newUser.block
    });
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.ValidationError(res, errors.array().map(err => err.msg).join(', '));
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return apiResponse.UnAuthorized(res, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse.UnAuthorized(res, 'Invalid email or password');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.SECRETKEY || 'default_secret_key', 
      { algorithm: 'HS256', expiresIn: '1d' }
    );

    return apiResponse.SuccessResponseWithToken(res, token, 'Login successful', {
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.phone
    });
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user details with related data
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Wishlist, attributes: ['id', 'destination'] },
        // Only select fields that actually exist in TopDestination table
        { model: TopDestination, attributes: ['id', 'type', 'value', 'count', 'visited', 'createdAt', 'updatedAt'] },
        { model: Highlight, attributes: ['id', 'type', 'value'] },
      ],
    });

    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    // Fetch wishlist with post details (like getAllWishlist)
    const wishlist = await Wishlist.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Post,
          include: [
            { model: User, attributes: ['id', 'full_name', 'image'] },
            { model: models.Photo, attributes: ['id', 'image_url'] }
          ]
        }
      ]
    });

    // Fetch additional counts
    const totalPosts = await Post.count({ where: { user_id: userId } });
    const totalFollowers = await Follower.count({ where: { user_id: userId } });
    const totalFollowing = await Follower.count({ where: { follower_id: userId } });

    return apiResponse.SuccessResponseWithData(res, 'Profile retrieved successfully', {
      user,
      wishlist, // include detailed wishlist with post info
      stats: {
        totalPosts,
        totalFollowers,
        totalFollowing,
      },
    });
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.editProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Extract fields from the request body
    const {
      full_name,
      phone,
      email,
      address,
      public_profile,
      location_sharing,
      message_request,
      instagram_sync,
      contact_sync,
      notification_type,
      image // Accept image URL or S3 key
    } = req.body;

    // Validate notification_type format (e.g., "1", "1,2", "1,2,3,4")
    if (notification_type && !/^(?:[1-4](?:,[1-4])*)?$/.test(notification_type)) {
      return apiResponse.ValidationError(res, 'Invalid notification_type format');
    }

    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    // Handle image update: if image is present, delete previous from S3 (if any), then update
    if (image !== undefined) {
      if (user.image) {
        // Extract S3 key from previous image URL if it is an S3 URL
        const prevKey = user.image.includes('amazonaws.com/')
          ? user.image.split('.amazonaws.com/')[1]
          : null;
        if (prevKey) {
          try { await s3Util.deleteFromS3(prevKey); } catch (e) { /* ignore */ }
        }
      }
      user.image = image;
    }

    // Update only the provided fields
    const updatedFields = {};
    if (full_name !== undefined) updatedFields.full_name = full_name;
    if (phone !== undefined) updatedFields.phone = phone;
    if (email !== undefined) updatedFields.email = email;
    if (address !== undefined) updatedFields.address = address;
    if (public_profile !== undefined) updatedFields.public_profile = public_profile;
    if (location_sharing !== undefined) updatedFields.location_sharing = location_sharing;
    if (message_request !== undefined) updatedFields.message_request = message_request;
    if (instagram_sync !== undefined) updatedFields.instagram_sync = instagram_sync;
    if (contact_sync !== undefined) updatedFields.contact_sync = contact_sync;
    if (notification_type !== undefined) updatedFields.notification_type = notification_type;

    await user.update(updatedFields);

    return apiResponse.SuccessResponseWithData(res, 'Profile updated successfully', user);
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    // Extract fields from the request body
    const { current_password, new_password, confirm_password } = req.body;

    // Validate input
    if (!current_password || !new_password || !confirm_password) {
      return apiResponse.ValidationError(res, 'All fields (current_password, new_password, confirm_password) are required');
    }

    if (new_password !== confirm_password) {
      return apiResponse.ValidationError(res, 'New password and confirm password do not match');
    }

    // Fetch the user
    const user = await User.findByPk(userId);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    // Check if the current password is correct
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return apiResponse.ValidationError(res, 'Current password is incorrect');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update the user's password
    await user.update({ password: hashedPassword });

    return apiResponse.SuccessResponseWithOutData(res, 'Password changed successfully');
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

/**
 * @desc Send OTP to user's email for password reset
 * @route POST /api/auth/send-otp
 * @access Public
 */
exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate input
    if (!email) {
      return apiResponse.ValidationError(res, 'Email is required');
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return apiResponse.NotFound(res, 'User not found with this email');
    }

    // Generate OTP and token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Delete any existing OTPs for this user
    await UserOtp.destroy({ where: { user_id: user.id } });

    // Create new OTP record
    await UserOtp.create({
      user_id: user.id,
      otp,
      resetToken,
      expiresAt
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your Password Reset OTP',
      html: `
        <p>Your OTP for password reset is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    return apiResponse.SuccessResponseWithOutData(res, 'OTP sent successfully');
  } catch (error) {
    console.error('Error in sendOtp:', error);
    return apiResponse.InternalServerError(res, 'Failed to send OTP');
  }
};

/**
 * @desc Resend OTP to user's email
 * @route POST /api/auth/resend-otp
 * @access Public
 */
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate input
    if (!email) {
      return apiResponse.ValidationError(res, 'Email is required');
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return apiResponse.NotFound(res, 'User not found with this email');
    }

    // Generate new OTP and token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update existing OTP or create new one
    await UserOtp.destroy({ where: { user_id: user.id } });
    await UserOtp.create({
      user_id: user.id,
      otp,
      resetToken,
      expiresAt
    });

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your New Password Reset OTP',
      html: `
        <p>Your new OTP for password reset is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    return apiResponse.SuccessResponseWithOutData(res, 'New OTP sent successfully');
  } catch (error) {
    console.error('Error in resendOtp:', error);
    return apiResponse.InternalServerError(res, 'Failed to resend OTP');
  }
};

/**
 * @desc Verify OTP and return reset token
 * @route POST /api/auth/verify-otp
 * @access Public
 */
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !otp) {
      return apiResponse.ValidationError(res, 'Email and OTP are required');
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    // Find the most recent OTP for this user
    const otpRecord = await UserOtp.findOne({
      where: {
        user_id: user.id,
        otp,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!otpRecord) {
      return apiResponse.ValidationError(res, 'Invalid or expired OTP');
    }

    return apiResponse.SuccessResponseWithData(res, 'OTP verified successfully', { 
      resetToken: otpRecord.resetToken 
    });
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    return apiResponse.InternalServerError(res, 'Failed to verify OTP');
  }
};

/**
 * @desc Reset user password using valid reset token
 * @route POST /api/auth/reset-password
 * @access Public
 */
exports.resetPassword = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  try {
    // Validate input
    if (!resetToken || !newPassword || !confirmPassword) {
      return apiResponse.ValidationError(res, 'All fields are required');
    }

    if (newPassword !== confirmPassword) {
      return apiResponse.ValidationError(res, 'Passwords do not match');
    }

    // Find valid OTP record
    const otpRecord = await UserOtp.findOne({
      where: {
        resetToken,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!otpRecord) {
      return apiResponse.ValidationError(res, 'Invalid or expired reset token');
    }

    // Get user and update password
    const user = await User.findByPk(otpRecord.user_id);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    // Delete all OTPs for this user
    await UserOtp.destroy({ where: { user_id: user.id } });

    return apiResponse.SuccessResponseWithOutData(res, 'Password reset successfully');
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return apiResponse.InternalServerError(res, 'Failed to reset password');
  }
};

exports.syncContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return apiResponse.ValidationError(res, 'Contacts array is required');
    }

    // Normalize phone numbers (remove spaces, dashes, etc.)
    const normalizedContacts = contacts.map(phone =>
      phone.replace(/[\s\-()+]/g, '')
    );

    // Find users in the app with these phone numbers (excluding self)
    const users = await User.findAll({
      where: {
        phone: { [Op.in]: normalizedContacts },
        id: { [Op.ne]: userId }
      },
      attributes: ['id', 'full_name', 'phone', 'image', 'email']
    });

    // Get all user ids from found users
    const userIds = users.map(u => u.id);

    // Find which of these users are already followed by the current user
    const following = await models.Follower.findAll({
      where: {
        follower_id: userId,
        user_id: { [Op.in]: userIds }
      },
      attributes: ['user_id']
    });
    const followingIds = following.map(f => f.user_id);

    // Prepare response: show follow status for each user
    const result = users.map(u => ({
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      image: u.image,
      email: u.email,
      isFollowing: followingIds.includes(u.id),
      showFollow: !followingIds.includes(u.id)
    }));

    return apiResponse.SuccessResponseWithData(res, 'Contacts synced successfully', result);
  } catch (error) {
    console.error('Error in syncContacts:', error);
    return apiResponse.InternalServerError(res, 'Failed to sync contacts');
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    await user.destroy();

    return apiResponse.SuccessResponseWithOutData(res, 'Account deleted successfully');
  } catch (error) {
    console.error('Error in deleteAccount:', error);
    return apiResponse.InternalServerError(res, 'Failed to delete account');
  }
};