const express = require('express');
const router = express.Router();
const authRoute = require('./authRoute');
const reviewRoute = require('./postRoute');
const socialRoute = require('./socialRoutes');
const adminRoute = require('./adminRoute');
<<<<<<< HEAD
const exploreRoute = require('./exploreRoute');
=======
>>>>>>> 3e8f7a108434718b2ceae581bd554605d3a9c69e

// Use auth routes
router.use('/auth', authRoute);
router.use( reviewRoute);
router.use(socialRoute);
router.use('/api',adminRoute);
<<<<<<< HEAD
router.use('/explore',exploreRoute);
=======
>>>>>>> 3e8f7a108434718b2ceae581bd554605d3a9c69e

module.exports = router;
