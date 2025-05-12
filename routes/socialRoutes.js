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


module.exports = router;