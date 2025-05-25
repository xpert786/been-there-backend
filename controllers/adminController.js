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
 * Accepts { type: 1 | 2 } in req.body: 1 = all, 2 = top 5 only.
 */
exports.getMostVisitedCountries = async (req, res) => {
  try {
    const { TopDestination } = models;
    const { type = 1 } = req.body;

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
