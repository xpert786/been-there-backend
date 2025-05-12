const models = require('../models');
const User = models.User;
const jwt = require('jsonwebtoken');
const apiResponse = require('../utills/apiResponse');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return apiResponse.UnAuthorized(res, 'Missing authorization header');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SECRETKEY);
    req.user = decoded;
    next();
  } catch (err) {
    return apiResponse.TokenExpiredError(res, err);
  }
};

module.exports = verifyToken;
