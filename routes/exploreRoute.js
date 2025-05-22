const express = require('express');
const router = express.Router();
const exploreController = require('../controllers/exploreController');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     LocationSearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             posts:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   title:
 *                     type: string
 *                     example: "Amazing Tokyo Experience"
 *                   User:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: "traveler123"
 *                       profilePicture:
 *                         type: string
 *                         example: "https://example.com/profile.jpg"
 *                   Photos:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         url:
 *                           type: string
 *                           example: "https://example.com/photo.jpg"
 *                   Reviews:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         rating:
 *                           type: number
 *                           example: 4.5
 *                         comment:
 *                           type: string
 *                           example: "Great experience!"
 *                   stats:
 *                     type: object
 *                     properties:
 *                       followerCount:
 *                         type: integer
 *                         example: 1
 *                       publicCount:
 *                         type: integer
 *                         example: 0
 *                       followerReviews:
 *                         type: integer
 *                         example: 2
 *                       publicReviews:
 *                         type: integer
 *                         example: 1
 *                       averageRating:
 *                         type: number
 *                         example: 4.5
 *             statistics:
 *               type: object
 *               properties:
 *                 totalFollowerPosts:
 *                   type: integer
 *                   example: 5
 *                 totalPublicPosts:
 *                   type: integer
 *                   example: 3
 *                 totalFollowerReviews:
 *                   type: integer
 *                   example: 10
 *                 totalPublicReviews:
 *                   type: integer
 *                   example: 5
 *                 overallAverageRating:
 *                   type: number
 *                   example: 4.2
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error searching posts by location"
 *         error:
 *           type: string
 *           example: "Database connection error"
 */

/**
 * @swagger
 * /explore/location:
 *   get:
 *     summary: Search posts by location
 *     description: Retrieve posts based on location (continent, country, or city) with statistics about followers and public engagement
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location to search for (continent, country, or city)
 *         example: "Tokyo"
 *         required: true
 *     responses:
 *       200:
 *         description: Successfully retrieved posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationSearchResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/location' , exploreController.searchByLocation);

/**
 * @swagger
 * components:
 *   schemas:
 *     FilteredLocationSearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             posts:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   title:
 *                     type: string
 *                     example: "Beautiful Sunset in Tokyo"
 *                   content:
 *                     type: string
 *                     example: "Amazing view from Tokyo Tower"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-03-15T10:30:00Z"
 *                   User:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: "traveler123"
 *                       profilePicture:
 *                         type: string
 *                         example: "https://example.com/profile.jpg"
 *                   Photos:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         url:
 *                           type: string
 *                           example: "https://example.com/photo.jpg"
 *                   isFollowing:
 *                     type: boolean
 *                     example: true
 *             locationPhotos:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   url:
 *                     type: string
 *                     example: "https://example.com/photo.jpg"
 *                   postId:
 *                     type: integer
 *                     example: 1
 */

/**
 * @swagger
 * /explore/location/filtered:
 *   get:
 *     summary: Search posts by location with additional filters
 *     description: Retrieve posts based on location with options to filter by followed users and sort by recent
 *     tags: [Explore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location to search for (continent, country, or city)
 *         example: "Japan"
 *         required: true
 *       - in: query
 *         name: followed
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Filter by followed users (1) or public users (0)
 *         example: "1"
 *       - in: query
 *         name: recent
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *         description: Sort by most recent (1) or default order (0)
 *         example: "1"
 *     responses:
 *       200:
 *         description: Successfully retrieved filtered posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FilteredLocationSearchResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/location/filtered', exploreController.searchByLocationFiltered);

module.exports = router;
