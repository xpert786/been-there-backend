const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const verifyToken = require('../middleware/verifyToken');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(verifyToken);

/**
 * @swagger
 * /follow:
 *   post:
 *     summary: Follow, unfollow, or manage follow requests for a user
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
 *               action:
 *                 type: string
 *                 enum: [cancel]
 *                 description: Optional action. Omit to send a follow request / follow a public user. Use `cancel` to withdraw a pending request.
 *     responses:
 *       200:
 *         description: Follow state updated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/follow', socialController.followUser);

/**
 * @swagger
 * /follow/requests:
 *   get:
 *     summary: Get pending follow requests for the current user
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending follow requests
 *       500:
 *         description: Internal server error
 */
router.get('/follow/requests', socialController.getFollowRequests);

/**
 * @swagger
 * /follow/requests/{requestId}/respond:
 *   post:
 *     summary: Accept or reject a follow request
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the follow request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [accept, reject]
 *     responses:
 *       200:
 *         description: Follow request handled successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Follow request not found
 *       500:
 *         description: Internal server error
 */
router.post('/follow/requests/:requestId/respond', socialController.respondToFollowRequest);

/**
 * @swagger
 * /follow/requests/{requestId}/cancel:
 *   post:
 *     summary: Cancel a pending follow request
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the follow request to cancel
 *     responses:
 *       200:
 *         description: Follow request cancelled successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Follow request not found
 *       500:
 *         description: Internal server error
 */
router.post('/follow/requests/:requestId/cancel', socialController.cancelFollowRequest);

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
 *     summary: Get all top destinations for a user (by userId)
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user whose top destinations to fetch
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
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/topdestinations/all', socialController.getTopDestinations);

/**
 * @swagger
 * /wishlist/all:
 *   get:
 *     summary: Get all wishlist items for a user (by userId)
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user whose wishlist to fetch
 *     responses:
 *       200:
 *         description: Wishlist fetched successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/wishlist/all', socialController.getAllWishlist);

/**
 * @swagger
 * /image/upload:
 *   post:
 *     summary: Upload an image to S3
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: No image provided
 *       500:
 *         description: Internal server error
 */
router.post('/image/upload', socialController.uploadImage);

/**
 * @swagger
 * /image/delete:
 *   delete:
 *     summary: Delete an image from S3
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
 *               key:
 *                 type: string
 *                 description: S3 object key (e.g. "uploads/filename.jpg")
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Key is required
 *       500:
 *         description: Internal server error
 */
router.delete('/image/delete', socialController.deleteImage);

/**
 * @swagger
 * /user/message-request/{userId}:
 *   get:
 *     summary: Check if a user has enabled message requests
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to check
 *     responses:
 *       200:
 *         description: Message request status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messageRequestEnabled:
 *                   type: boolean
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/user/message-request/:userId', socialController.checkMessageRequestEnabled);

/**
 * @swagger
 * /social/followers:
 *   get:
 *     summary: Get all users that follow the current user
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search by full name of the follower (case-insensitive, partial match)
 *     responses:
 *       200:
 *         description: List of followers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       full_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       image:
 *                         type: string
 *                       address:
 *                         type: string
 *                       followedAt:
 *                         type: integer
 *                         format: int64
 *                       status_type:
 *                         type: string
 *                         enum: [followed, req_sent, no_follow]
 *                         description: |
 *                           Relationship status from logged-in user's perspective:
 *                           - "followed": Logged-in user is following this follower back
 *                           - "req_sent": Logged-in user has sent a pending follow request to this follower
 *                           - "no_follow": Logged-in user is not following this follower and hasn't sent a request
 *       500:
 *         description: Internal server error
 */
router.get('/social/followers', socialController.getFollowers);

/**
 * @swagger
 * /social/following:
 *   get:
 *     summary: Get all users that the current user is following
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search by full name of the followed user (case-insensitive, partial match)
 *     responses:
 *       200:
 *         description: List of following users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 following:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       full_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       image:
 *                         type: string
 *                       location:
 *                         type: string
 *                       followedAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/social/following', socialController.getFollowing);

/**
 * @swagger
 * /users/status:
 *   get:
 *     summary: Get all users (except current user) with follow status and search
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search by full name or email (case-insensitive, partial match)
 *     responses:
 *       200:
 *         description: Users with follow status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       full_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       image:
 *                         type: string
 *                       address:
 *                         type: string
 *                       isFollowing:
 *                         type: boolean
 *       500:
 *         description: Internal server error
 */
router.get('/users/status', socialController.getAllUsersWithFollowStatus);
//make a send message notification route
router.post('/send-message-notification', socialController.sendMessageNotification);
/**
 * @swagger
 * /send-message-notification:
 *   post:
 *     summary: Send a message notification
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
 *               user_id:
 *                 type: string
 *                 description: The ID of the user to send the notification to
 *               message:
 *                 type: string
 *                 description: The message to send
 *     responses:
 *       200:
 *         description: Message notification sent successfully
 *       500:
 *         description: Internal server error
 */ 

module.exports = router;