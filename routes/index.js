const express = require('express');
const router = express.Router();
const authRoute = require('./authRoute');
const reviewRoute = require('./postRoute');
const socialRoute = require('./socialRoutes');
const adminRoute = require('./adminRoute');
const exploreRoute = require('./exploreRoute');
const passportRoute = require('./passportRoute');
const adminAuthRoute = require('./adminAuthRoute');

// Use auth routes
router.use('/auth', authRoute);
router.use('/api/admin', adminAuthRoute);
router.use('/api', adminRoute);
router.use(reviewRoute);
router.use(socialRoute);
router.use('/explore', exploreRoute);
router.use('/passport', passportRoute);

module.exports = router;
