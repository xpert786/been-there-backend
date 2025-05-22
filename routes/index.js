const express = require('express');
const router = express.Router();
const authRoute = require('./authRoute');
const reviewRoute = require('./postRoute');
const socialRoute = require('./socialRoutes');
const adminRoute = require('./adminRoute');
const exploreRoute = require('./exploreRoute');
const passportRoute = require('./passportRoute');

// Use auth routes
router.use('/auth', authRoute);
router.use( reviewRoute);
router.use(socialRoute);
router.use('/api',adminRoute);
router.use('/explore',exploreRoute);
router.use('/passport',passportRoute);

module.exports = router;
