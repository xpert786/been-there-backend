const models = require('../models');
const User = models.User;
const apiResponse = require('../utils/apiResponse');
const { Op } = require('sequelize');
const validator = require('validator');
const moment = require('moment');
const s3Util = require('../utils/s3');

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

// Delete a user
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return apiResponse.ValidationError(res, 'User ID is required');
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    if (req.user.id === user.id) {
      return apiResponse.Forbidden(res, 'You cannot delete your own account');
    }

    await user.destroy();
    return apiResponse.SuccessResponseWithOutDataW(res, 'User deleted successfully');
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to delete user');
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
  const updateData = req.body;

  // Accept both integer and UUID (string with dashes)
  if (!id || (isNaN(id) && !/^[0-9a-fA-F-]{36}$/.test(id))) {
    return apiResponse.ValidationError(res, 'Valid user ID is required');
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    return apiResponse.ValidationError(res, 'No fields provided for update');
  }

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }

    // Field validators
    const fieldValidators = {
      full_name: value => typeof value === 'string' && value.trim().length >= 2,
      email: value => validator.isEmail(value),
      phone: value => validator.isMobilePhone(value),
      country: value => typeof value === 'string' && value.trim().length > 0,
      address: value => typeof value === 'string' && value.trim().length > 0,
      image: value => validator.isURL(value, { protocols: ['http', 'https'] }),
      block: value => typeof value === 'boolean',
      public_profile: value => typeof value === 'boolean'
    };

    // Handle image update: if image is present, delete previous from S3 (if any), then update
    if (updateData.image !== undefined) {
      if (user.image) {
        const prevKey = user.image.includes('amazonaws.com/')
          ? user.image.split('.amazonaws.com/')[1]
          : null;
        if (prevKey) {
          try { await s3Util.deleteFromS3(prevKey); } catch (e) { /* ignore */ }
        }
      }
      user.image = updateData.image;
    }

    const updates = {};
    const errors = [];

    // Validate each field
    for (const [field, value] of Object.entries(updateData)) {
      if (field in fieldValidators && field !== 'image') {
        if (fieldValidators[field](value)) {
          updates[field] = value;
        } else {
          errors.push(`Invalid value for ${field}`);
        }
      } else {
        errors.push(`Field ${field} is not allowed for update`);
      }
    }

    if (errors.length > 0) {
      return apiResponse.ValidationError(res, errors.join(', '));
    }

    if (Object.keys(updates).length === 0) {
      return apiResponse.ValidationError(res, 'No valid fields provided for update');
    }

    await user.update(updates);

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] }
    });

    return apiResponse.SuccessResponseWithData(res, 'User updated successfully', updatedUser);
  } catch (error) {
    console.error('Error in updateUser:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return apiResponse.Conflict(res, 'Email already in use');
    }
    
    return apiResponse.InternalServerError(res, 'Failed to update user');
  }
};