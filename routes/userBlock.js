const express = require('express');
const router = express.Router();
const userBlockController = require('../controllers/userBlockController');
const verifyToken = require('../middleware/verifyToken');

/**
 * @swagger
 * /user-block/block:
 *   post:
 *     summary: Block a user
 *     tags: [UserBlock]
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
 *                 description: ID of the user to block
 *     responses:
 *       200:
 *         description: User blocked successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/block',verifyToken, userBlockController.blockUser);

/**
 * @swagger
 * /user-block/unblock:
 *   post:
 *     summary: Unblock a user
 *     tags: [UserBlock]
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
 *                 description: ID of the user to unblock
 *     responses:
 *       200:
 *         description: User unblocked successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Block not found
 *       500:
 *         description: Internal server error
 */
router.post('/unblock',verifyToken, userBlockController.unblockUser);

/**
 * @swagger
 * /user-block/blocked:
 *   get:
 *     summary: Get all users blocked by the current user
 *     tags: [UserBlock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked users fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   full_name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   image:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get('/blocked',verifyToken, userBlockController.getBlockedUsers);

module.exports = router;
