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
router.post('/sync', instagramController.syncInstagram);
router.get('/posts', instagramController.getInstagramPosts);


module.exports = router;