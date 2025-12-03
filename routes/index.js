const express = require('express');
const router = express.Router();
const authRoute = require('./authRoute');
const reviewRoute = require('./postRoute');
const socialRoute = require('./socialRoutes');
const adminRoute = require('./adminRoute');
const exploreRoute = require('./exploreRoute');
const passportRoute = require('./passportRoute');
const adminAuthRoute = require('./adminAuthRoute');
const instagramRoute = require('./instaRoute');
const notificationRoute = require('./notificationRoute');
const userBlockRoutes = require('./userBlock');

// Use auth routes
router.use('/auth', authRoute);
router.use('/admin', adminAuthRoute);
router.use(adminRoute);
router.use(reviewRoute);
router.use(socialRoute);
router.use('/explore', exploreRoute);
router.use('/passport', passportRoute);
router.use('/instagram', instagramRoute);
router.use(notificationRoute);
router.use('/user-block', userBlockRoutes);

module.exports = router;
