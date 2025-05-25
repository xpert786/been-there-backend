const models = require('../models');

module.exports = async (req, res, next) => {
  try {
    // req.user is set by verifyToken middleware
    const { id } = req.user || {};
    if (!id) {
      return res.status(401).json({
        status: false,
        message: 'Unauthorized: No user found in token',
        data: null
      });
    }
    // Check if user exists in AdminUser table
    const admin = await models.AdminUser.findByPk(id);
    if (!admin) {
      return res.status(403).json({
        status: false,
        message: 'Forbidden: Admin access only',
        data: null
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Internal server error',
      data: null
    });
  }
};
