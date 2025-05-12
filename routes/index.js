const express = require('express');
const router = express.Router();
const authRoute = require('./authRoute');
const reviewRoute = require('./postRoute');
const socialRoute = require('./socialRoutes');

// Use auth routes
router.use('/auth', authRoute);
router.use( reviewRoute);
router.use(socialRoute);

module.exports = router;
