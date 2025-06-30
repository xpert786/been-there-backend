const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifyToken = require('../middleware/verifyToken');

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for the current user
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of notifications to skip
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// GET /notifications - get notifications for current user
router.get('/notifications', verifyToken, notificationController.getNotifications);

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a notification (e.g. when a user receives a message)
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: ID of the user to notify (recipient)
 *               message:
 *                 type: string
 *                 description: Notification message
 *     responses:
 *       200:
 *         description: Notification created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
// POST /notifications - create a new notification
router.post('/notifications', verifyToken, notificationController.createNotification);

module.exports = router;
