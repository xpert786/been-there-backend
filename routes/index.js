const express = require('express');
const router = express.Router();
const authRoute = require('./authRoute');
const reviewRoute = require('./postRoute');
const socialRoute = require('./socialRoutes');
const adminRoute = require('./adminRoute');

// Use auth routes
router.use('/auth', authRoute);
router.use( reviewRoute);
router.use(socialRoute);
router.use('/api',adminRoute);

module.exports = router;
