// instagram.routes.js
const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');

/**
 * @swagger
 * /instagram/sync:
 *   post:
 *     summary: Exchange Instagram authorization code for access token
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Instagram authorization code from frontend
 *     responses:
 *       200:
 *         description: Instagram access token fetched successfully
 *       400:
 *         description: Missing code
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /instagram/posts:
 *   get:
 *     summary: Get Instagram posts for the authenticated user (handles token refresh automatically)
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instagram posts fetched successfully
 *       400:
 *         description: User not authenticated or Instagram not linked
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /instagram/posts/{postId}:
 *   get:
 *     summary: Get details for a specific Instagram post by postId
 *     tags: [Instagram]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Instagram post ID
 *     responses:
 *       200:
 *         description: Instagram post details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     caption:
 *                       type: string
 *                     media_type:
 *                       type: string
 *                     media_url:
 *                       type: string
 *                     thumbnail_url:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     location:
 *                       type: object
 *                     permalink:
 *                       type: string
 *                     children:
 *                       type: object
 *       400:
 *         description: User not authenticated, Instagram not linked, or Post ID is required
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /instagram/auth:
 *   get:
 *     summary: Empty Instagram auth endpoint (returns success)
 *     tags: [Instagram]
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.post('/sync', instagramController.syncInstagram);
router.get('/posts', instagramController.getInstagramPosts);
router.get('/posts/:postId', instagramController.getInstagramPostDetails);
router.get('/auth', instagramController.instagramAuth);


module.exports = router;