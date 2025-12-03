const models = require('../models');
const apiResponse = require('../utils/apiResponse');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Admin user login
exports.loginAdminUser = async (req, res) => {
  console.log('test it')
  try {
    console.log('Login attempt with body:', req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      return apiResponse.ValidationError(res, 'Email and password are required');
    }
    console.log('Email:')
    const adminUser = await models.AdminUser.findOne({ where: { email } });
    if (!adminUser) {
      return apiResponse.UnAuthorized(res, 'Invalid email or password');
    }
    console.log('Admin user found:', adminUser.id);
    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) {
      return apiResponse.UnAuthorized(res, 'Invalid email or password');
    }
    console.log('Password match for admin user:', adminUser.id);

    // Generate JWT token (reuse user logic if available)
    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'admin' },
      process.env.SECRETKEY,
      { expiresIn: '7d' }
    );
    console.log('JWT token generated for admin user:', adminUser.id);
    // Do not return password
    const { password: _, ...adminUserData } = adminUser.toJSON();

    return apiResponse.SuccessResponseWithData(res, 'Admin login successful', {
      token,
      admin: adminUserData
    });
  } catch (error) {
    console.error('Error in loginAdminUser:', error);
    return apiResponse.InternalServerError(res, 'Failed to login admin user');
  }
};

// Create default admin user and return JWT token
exports.createDefaultAdminAndGetToken = async (req, res) => {
  try {
    const email = 'admin12@yopmail.com';
    const password = 'Testing1@1234';
    const full_name = 'Default Admin';

    let adminUser = await models.AdminUser.findOne({ where: { email } });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(password, 10);
      adminUser = await models.AdminUser.create({
        full_name,
        email,
        password: hashedPassword
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'admin' },
      process.env.SECRETKEY,
      { expiresIn: '7d' }
    );

    // Do not return password
    const { password: _, ...adminUserData } = adminUser.toJSON();

    return apiResponse.SuccessResponseWithData(res, 'Default admin created and token generated', {
      token,
      admin: adminUserData
    });
  } catch (error) {
    console.error('Error in createDefaultAdminAndGetToken:', error);
    return apiResponse.InternalServerError(res, 'Failed to create default admin and generate token');
  }
};