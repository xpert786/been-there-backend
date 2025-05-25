const models = require('../models');
const User = models.User;
const apiResponse = require('../utils/apiResponse');
const { Op } = require('sequelize');
const validator = require('validator');
const moment = require('moment');
const s3Util = require('../utils/s3');
const bcrypt = require('bcrypt');

// Get all users (excluding sensitive data)
exports.getAllUsers = async (req, res) => {
  const { 
    search, 
    country, 
    signup_date, // use signup_date instead of signup_from/signup_to
    page = 1, 
    limit = 10,
    blocked
  } = req.query;

  const hasSearchParams = search || country || signup_date || blocked !== undefined;

  if (!hasSearchParams) {
    try {
      const users = await User.findAll({ 
        attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
        order: [['createdAt', 'DESC']]
      });
      return apiResponse.SuccessResponseWithData(res, 'Users fetched successfully', users);
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return apiResponse.InternalServerError(res, 'Failed to fetch users');
    }
  }

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);

  if (isNaN(pageInt) || pageInt < 1) {
    return apiResponse.ValidationError(res, 'Page must be a positive integer');
  }
  if (isNaN(limitInt)) {
    return apiResponse.ValidationError(res, 'Limit must be an integer');
  }
  const effectiveLimit = Math.min(limitInt, 100);

  const where = {};

  // Search condition
  if (search && typeof search === 'string') {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    where[Op.or] = [
      models.sequelize.where(
        models.sequelize.fn('LOWER', models.sequelize.col('full_name')),
        { [Op.like]: searchTerm }
      ),
      models.sequelize.where(
        models.sequelize.fn('LOWER', models.sequelize.col('email')),
        { [Op.like]: searchTerm }
      ),
      models.sequelize.where(
        models.sequelize.fn('LOWER', models.sequelize.col('address')),
        { [Op.like]: searchTerm }
      ),
    ];
  }

  // Country filter: look for value anywhere in address (case-insensitive)
  if (country && typeof country === 'string') {
    const countryTerm = `%${country.trim().toLowerCase()}%`;
    where[Op.and] = where[Op.and] || [];
    where[Op.and].push(
      models.sequelize.where(
        models.sequelize.fn('LOWER', models.sequelize.col('address')),
        { [Op.like]: countryTerm }
      )
    );
  }

  // Blocked filter
  if (blocked !== undefined) {
    where.block = blocked === 'true' || blocked === true;
  }

  // Signup date filter: match only the date part of createdAt
  if (signup_date && typeof signup_date === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(signup_date)) {
      return apiResponse.ValidationError(res, 'signup_date must be in YYYY-MM-DD format');
    }
    const start = new Date(signup_date + 'T00:00:00.000Z');
    const end = new Date(signup_date + 'T23:59:59.999Z');
    where.createdAt = { [Op.between]: [start, end] };
  }

  try {
    const { count: totalCount, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] },
      limit: effectiveLimit,
      offset: (pageInt - 1) * effectiveLimit,
      order: [['createdAt', 'DESC']]
    });

    return apiResponse.SuccessResponseWithData(res, 'Users fetched successfully', {
      users,
      pagination: {
        totalItems: totalCount,
        currentPage: pageInt,
        totalPages: Math.ceil(totalCount / effectiveLimit),
        itemsPerPage: effectiveLimit,
        hasNextPage: pageInt * effectiveLimit < totalCount,
        hasPreviousPage: pageInt > 1
      }
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return apiResponse.InternalServerError(res, 'Failed to fetch users');
  }
};

// Block or unblock a user
exports.blockUser = async (req, res) => {
  const { user_id, block } = req.body;
  
  if (!user_id) {
    return apiResponse.ValidationError(res, 'User ID is required');
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    if (req.user.id === user.id) {
      return apiResponse.Forbidden(res, 'You cannot block your own account');
    }

    user.block = Boolean(block);
    await user.save();
    
    return apiResponse.SuccessResponseWithData(
      res, 
      `User ${block ? 'blocked' : 'unblocked'} successfully`, 
      { id: user.id, block: user.block }
    );
  } catch (error) {
    console.error('Error in blockUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to update user status');
  }
};

// Delete a user and all related data
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json("User ID is required");
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json("User not found");
    }

    if (req.user.id === user.id) {
      return res.status(403).json("You cannot delete your own account");
    }

    // Delete related data in all tables
    const { Follower, Post, Wishlist, TopDestination, Comment, Like, Highlight, UserOtp, Photo } = models;

    // Delete followers (where user is either user_id or follower_id)
    await Follower.destroy({ where: { user_id: userId } });
    await Follower.destroy({ where: { follower_id: userId } });

    // Delete comments made by user
    await Comment.destroy({ where: { user_id: userId } });

    // Delete likes made by user
    await Like.destroy({ where: { user_id: userId } });

    // Delete wishlists by user
    await Wishlist.destroy({ where: { user_id: userId } });

    // Delete highlights by user
    if (Highlight) await Highlight.destroy({ where: { user_id: userId } });

    // Delete top destinations by user
    await TopDestination.destroy({ where: { user_id: userId } });

    // Delete OTPs by user
    if (UserOtp) await UserOtp.destroy({ where: { user_id: userId } });

    // Delete all posts/photos/comments/likes for posts by this user
    const posts = await Post.findAll({ where: { user_id: userId } });
    for (const post of posts) {
      // Delete comments for this post
      await Comment.destroy({ where: { post_id: post.id } });
      // Delete likes for this post
      await Like.destroy({ where: { post_id: post.id } });
      // Delete wishlists for this post
      await Wishlist.destroy({ where: { post_id: post.id } });
      // Delete photos for this post
      if (Photo) await Photo.destroy({ where: { post_id: post.id } });
    }
    // Delete posts
    await Post.destroy({ where: { user_id: userId } });

    // Finally, delete the user
    await user.destroy();

    return apiResponse.SuccessResponseWithOutData(res, 'User and all related data deleted successfully');
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to delete user and related data');
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  
  // Accept both integer and UUID (string with dashes)
  if (!id || (isNaN(id) && !/^[0-9a-fA-F-]{36}$/.test(id))) {
    return apiResponse.ValidationError(res, 'Valid user ID is required');
  }

  try {
    const user = await User.findByPk(id, { 
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] } 
    });
    
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }
    
    return apiResponse.SuccessResponseWithData(res, 'User details fetched successfully', user);
  } catch (error) {
    console.error('Error in getUserById:', error);
    return apiResponse.InternalServerError(res, 'Failed to fetch user details');
  }
};


// Update user (only provided fields)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body || {};

  // Validate ID: integer or UUID
  if (!id || (isNaN(id) && !/^[0-9a-fA-F-]{36}$/.test(id))) {
    return apiResponse.ValidationError(res, 'Valid user ID is required');
  }

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    // Handle image upload if present
    if (req.file && req.file.fieldname === 'image') {
      if (user.image && user.image.includes('amazonaws.com/')) {
        const prevKey = user.image.split('.amazonaws.com/')[1];
        if (prevKey) {
          try {
            await s3Util.deleteFromS3(prevKey);
          } catch (e) {
            console.warn('Failed to delete previous image from S3:', e.message);
          }
        }
      }
      const newImage = await s3Util.uploadToS3(req.file);
      updateData.image = newImage;
    }

    // Only allow updating fields that exist in the User model and are not restricted
    const allowedFields = ['full_name', 'country', 'address', 'block', 'public_profile', 'image'];
    const updates = {};
    const errors = [];

    for (const [key, val] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        // Convert boolean-like strings to boolean
        if (key === 'block' || key === 'public_profile') {
          if (val === 'true' || val === true) {
            updates[key] = true;
          } else if (val === 'false' || val === false) {
            updates[key] = false;
          } else {
            errors.push(`Invalid value for ${key}`);
          }
        } else {
          updates[key] = val;
        }
      } else {
        errors.push(`Field '${key}' is not allowed for update`);
      }
    }

    if (errors.length > 0) {
      return apiResponse.ValidationError(res, errors.join(', '));
    }

    if (Object.keys(updates).length > 0) {
      await user.update(updates);
    }

    await user.save();

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] }
    });

    return apiResponse.SuccessResponseWithData(res, 'User updated successfully', updatedUser);
  } catch (error) {
    console.error('Error in updateUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to update user');
  }
};

/**
 * Get platform statistics: total users, total posts, top visited country, top visited city
 */
exports.getPlatformStats = async (req, res) => {
  try {
    const { User, Post, TopDestination } = models;

    // Total users
    const totalUsers = await User.count();

    // Total posts
    const totalPosts = await Post.count();

    // Top visited country
    const topCountry = await TopDestination.findOne({
      where: { type: 'country' },
      attributes: ['value'],
      order: [['count', 'DESC']],
    });
    const topVisitedCountry = topCountry ? topCountry.value : null;

    // Top visited city
    const topCity = await TopDestination.findOne({
      where: { type: 'city' },
      attributes: ['value'],
      order: [['count', 'DESC']],
    });
    const topVisitedCity = topCity ? topCity.value : null;

    return apiResponse.SuccessResponseWithData(res, 'Platform stats fetched successfully', {
      totalUsers,
      totalPosts,
      topVisitedCountry,
      topVisitedCity
    });
  } catch (error) {
    console.error('Error in getPlatformStats:', error);
    return apiResponse.InternalServerError(res, 'Failed to fetch platform stats');
  }
};

/**
 * Get most visited countries with number of unique users who visited them.
 * Accepts type as query param: 1 = all, 2 = top 5 only.
 */
exports.getMostVisitedCountries = async (req, res) => {
  try {
    const { TopDestination } = models;
    const { type = 1 } = req.query;

    // Find all country visits, group by country, count unique users
    const results = await TopDestination.findAll({
      where: { type: 'country', visited: true },
      attributes: [
        ['value', 'name'],
        [models.sequelize.fn('COUNT', models.sequelize.fn('DISTINCT', models.sequelize.col('user_id'))), 'value']
      ],
      group: ['value'],
      order: [[models.sequelize.literal('value'), 'DESC']]
    });

    let data = results.map(r => ({
      name: r.get('name'),
      value: parseInt(r.get('value'), 10)
    }));

    // If type=2, return only top 5
    if (parseInt(type) === 2) {
      data = data.slice(0, 5);
    }

    return apiResponse.SuccessResponseWithData(res, 'Most visited countries fetched successfully', data);
  } catch (error) {
    console.error('Error in getMostVisitedCountries:', error);
    return apiResponse.InternalServerError(res, 'Failed to fetch most visited countries');
  }
};

// Create a new admin user
exports.createAdminUser = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
      return apiResponse.ValidationError(res, 'full_name, email, and password are required');
    }

    // Check if admin user already exists
    const existing = await models.AdminUser.findOne({ where: { email } });
    if (existing) {
      return apiResponse.ValidationError(res, 'Admin user with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await models.AdminUser.create({
      full_name,
      email,
      password: hashedPassword
    });

    // Do not return password in response
    const { password: _, ...adminUserData } = adminUser.toJSON();

    return apiResponse.SuccessResponseWithData(res, 'Admin user created successfully', adminUserData);
  } catch (error) {
    console.error('Error in createAdminUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to create admin user');
  }
};

// Get all admin users
exports.getAllAdminUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    const offset = (page - 1) * limit;

    const { count: totalItems, rows: adminUsers } = await models.AdminUser.findAndCountAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return apiResponse.SuccessResponseWithData(res, 'Admin users fetched successfully', {
      adminUsers,
      pagination: {
        totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        itemsPerPage: limit,
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error in getAllAdminUsers:', error);
    return apiResponse.InternalServerError(res, 'Failed to fetch admin users');
  }
};

// Edit admin user (only provided fields)
exports.editAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, password } = req.body;

    const adminUser = await models.AdminUser.findByPk(id);
    if (!adminUser) {
      return apiResponse.NotFound(res, 'Admin user not found');
    }

    if (full_name) adminUser.full_name = full_name;
    if (email) adminUser.email = email;
    if (password) {
      const hashedPassword = await require('bcrypt').hash(password, 10);
      adminUser.password = hashedPassword;
    }

    await adminUser.save();

    const { password: _, ...adminUserData } = adminUser.toJSON();
    return apiResponse.SuccessResponseWithData(res, 'Admin user updated successfully', adminUserData);
  } catch (error) {
    console.error('Error in editAdminUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to update admin user');
  }
};

// Delete admin user
exports.deleteAdminUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUser = await models.AdminUser.findByPk(id);
    if (!adminUser) {
      return apiResponse.NotFound(res, 'Admin user not found');
    }
    await adminUser.destroy();
    return apiResponse.SuccessResponseWithOutData(res, 'Admin user deleted successfully');
  } catch (error) {
    console.error('Error in deleteAdminUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to delete admin user');
  }
};


// Change password for admin user
exports.changeAdminPassword = async (req, res) => {
  try {
    const  id  = req.user.id; // assuming JWT middleware sets req.user
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return apiResponse.ValidationError(res, 'Old password and new password are required');
    }

    const adminUser = await models.AdminUser.findByPk(id);
    if (!adminUser) {
      return apiResponse.NotFound(res, 'Admin user not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, adminUser.password);
    if (!isMatch) {
      return apiResponse.ValidationError(res, 'Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    adminUser.password = hashedPassword;
    await adminUser.save();

    return apiResponse.SuccessResponseWithOutData(res, 'Password changed successfully');
  } catch (error) {
    console.error('Error in changeAdminPassword:', error);
    return apiResponse.InternalServerError(res, 'Failed to change password');
  }
};

// Get user signup analytics per month for the current year
exports.getUserSignupAnalytics = async (req, res) => {
  try {
    const { User } = models;
    const year = parseInt(req.query.year, 10); // Extract year from query params

    if (!year || isNaN(year)) {
      return apiResponse.ValidationFailed(res, 'Valid "year" must be provided as a query parameter.');
    }

    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`).getTime();
    const startOfNextYear = new Date(`${year + 1}-01-01T00:00:00.000Z`).getTime();

    // Get all users created in the specified year
    const users = await User.findAll({
      attributes: ['createdAt'],
      where: {
        createdAt: {
          [Op.gte]: startOfYear,
          [Op.lt]: startOfNextYear
        }
      }
    });

    // Prepare month map
    const monthMap = {
      0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
      6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
    };
    const analytics = Array.from({ length: 12 }, (_, i) => ({
      month: monthMap[i],
      users: 0
    }));

    // Count users per month
    users.forEach(u => {
      let createdAt = u.createdAt;
      if (typeof createdAt === 'number' || (typeof createdAt === 'string' && /^\d+$/.test(createdAt))) {
        createdAt = new Date(Number(createdAt));
      } else {
        createdAt = new Date(createdAt);
      }

      if (!isNaN(createdAt)) {
        const month = createdAt.getUTCMonth();
        if (analytics[month]) analytics[month].users += 1;
      }
    });

    return apiResponse.SuccessResponseWithData(res, 'User signup analytics fetched successfully', analytics);
  } catch (error) {
    console.error('Error in getUserSignupAnalytics:', error);
    return apiResponse.InternalServerError(res, 'Failed to fetch user signup analytics');
  }
};

// Edit admin profile (full_name, email, image)
exports.editAdminProfile = async (req, res) => {
  try {
    const { id } = req.user; // from verifyToken
    const { full_name, email } = req.body;
    let updateData = {};

    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;

    // Handle image upload if present
    if (req.file && req.file.fieldname === 'image') {
      // Optionally, delete previous image from S3 if you store S3 URLs
      const s3Util = require('../utils/s3');
      const adminUser = await models.AdminUser.findByPk(id);
      if (adminUser && adminUser.image && adminUser.image.includes('amazonaws.com/')) {
        const prevKey = adminUser.image.split('.amazonaws.com/')[1];
        if (prevKey) {
          try { await s3Util.deleteFromS3(prevKey); } catch (e) {}
        }
      }
      const newImage = await s3Util.uploadToS3(req.file);
      updateData.image = newImage;
    }

    const [affectedRows] = await models.AdminUser.update(updateData, { where: { id } });
    if (!affectedRows) {
      return apiResponse.NotFound(res, 'Admin user not found');
    }
    const updatedAdmin = await models.AdminUser.findByPk(id, { attributes: { exclude: ['password'] } });
    return apiResponse.SuccessResponseWithData(res, 'Profile updated successfully', updatedAdmin);
  } catch (error) {
    console.error('Error in editAdminProfile:', error);
    return apiResponse.InternalServerError(res, 'Failed to update admin profile');
  }
};


