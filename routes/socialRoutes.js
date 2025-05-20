const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);

/**
 * @swagger
 * /follow:
 *   post:
 *     summary: Toggle follow/unfollow a user
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               target_user_id:
 *                 type: string
 *                 example: "123"
 *     responses:
 *       200:
 *         description: Follow/unfollow toggled successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/follow', socialController.followUser);

/**
 * @swagger
 * /post/like:
 *   post:
 *     summary: Toggle like/unlike a post
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               post_id:
 *                 type: string
 *                 example: "123"
 *     responses:
 *       200:
 *         description: Like/unlike toggled successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.post('/post/like', socialController.likePost);

/**
 * @swagger
 * /post/comment/{postId}:
 *   post:
 *     summary: Comment on a post
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the post to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *                 example: "Great post!"
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.post('/post/comment/:postId', socialController.commentOnPost);

/**
 * @swagger
 * /topdestinations/all:
 *   get:
 *     summary: Get all top destinations for the authenticated user (filter by value)
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filterType
 *         schema:
 *           type: string
 *           enum: [continent, country, city]
 *         required: false
 *         description: Filter top destinations by type (continent, country, or city)
 *       - in: query
 *         name: filterValue
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by value (e.g. 'asia', 'india', 'delhi'). Matches continent, country, or city.
 *     responses:
 *       200:
 *         description: Top destinations fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/topdestinations/all', socialController.getTopDestinations);

/**
 * @swagger
 * /wishlist/all:
 *   get:
 *     summary: Get all wishlist items for the authenticated user (raw table)
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/wishlist/all', socialController.getAllWishlist);

module.exports = router;