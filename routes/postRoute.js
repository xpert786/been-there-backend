const express = require('express');
const { body } = require('express-validator');
const postController = require('../controllers/postController');
const verifyToken = require('../middleware/verifyToken');
<<<<<<< HEAD
const multer = require('multer');
const upload = multer();
=======
const upload = require('../middleware/multer');
>>>>>>> 3e8f7a108434718b2ceae581bd554605d3a9c69e

const router = express.Router();

/**
 * @swagger
 * /post:
 *   post:
 *     summary: Create a new post with multiple photos
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *               visit_date:
 *                 type: string
 *                 format: date
 *               reason_for_visit:
 *                 type: string
 *               overall_rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               experience:
 *                 type: string
 *               cost_rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               safety_rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               food_rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  '/post',
  verifyToken,
<<<<<<< HEAD
  upload.array('photos'), // this will handle multiple photo uploads
=======
  upload.array('photos', 5), // Allow up to 5 photos
>>>>>>> 3e8f7a108434718b2ceae581bd554605d3a9c69e
  [
    body('country').notEmpty().withMessage('Country is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('visit_date').isDate().withMessage('Visit date must be a valid date'),
    body('reason_for_visit').notEmpty().withMessage('Reason for visit is required'),
    // body('place_type').notEmpty().withMessage('Place type is required'),
  ],
  postController.createPost
);

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Fetch posts based on type (discover or following)
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *         required: true
 *         description: 1 for discover, 2 for following
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/posts', verifyToken, postController.getPosts);

/**
 * @swagger
 * /post/{postId}:
 *   get:
 *     summary: Fetch post details, including like and comment count, and comment details with user info
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the post
 *     responses:
 *       200:
 *         description: Post details retrieved successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.get('/post/:postId', verifyToken, postController.getPostDetail);

/**
 * @swagger
 * /post/userDetails/{userId}:
 *   get:
 *     summary: Get user details by user ID
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/post/userDetails/:userId', verifyToken, postController.getUserDetails);

/**
 * @swagger
 * /post/wishlist:
 *   post:
 *     summary: Add a post to wishlist
 *     tags: [Post]
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
 *                 description: ID of the post to wishlist
 *     responses:
 *       200:
 *         description: Post wishlisted successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.post('/post/wishlist', verifyToken, postController.wishlistPost);

module.exports = router;
