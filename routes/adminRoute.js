const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/verifyToken');
const multer = require('multer');
const upload = multer();

router.use(verifyToken);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (with optional search, filter, and pagination)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or address (case-insensitive, partial match)
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country (matches anywhere in address, case-insensitive)
 *       - in: query
 *         name: signup_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by sign-up date (YYYY-MM-DD, matches only the date part of createdAt)
 *       - in: query
 *         name: blocked
 *         schema:
 *           type: boolean
 *         description: Filter by blocked status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (for pagination)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (for pagination)
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/admin/users', adminController.getAllUsers);

/**
 * @swagger
 * /api/admin/user/{id}:
 *   get:
 *     summary: Get user details by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: Invalid user ID
 *       500:
 *         description: Internal server error
 */
router.get('/admin/user/:id', adminController.getUserById);

/**
 * @swagger
 * /api/admin/user/{id}:
 *   put:
 *     summary: Edit user (only update provided fields, including image in binary format)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               country:
 *                 type: string
 *               address:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (binary format). If present, previous image will be deleted from S3 and replaced.
 *               block:
 *                 type: boolean
 *               public_profile:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: Invalid user ID or no fields provided
 *       500:
 *         description: Internal server error
 */
router.put('/admin/user/:id', upload.single('image'), adminController.updateUser);


/**
 * @swagger
 * /api/admin/user/block:
 *   post:
 *     summary: Block or unblock a user
 *     tags: [Admin]
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
 *               block:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User block status updated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/admin/user/block', adminController.blockUser);

/**
 * @swagger
 * /api/admin/user/{userId}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/admin/user/:userId', adminController.deleteUser);

module.exports = router;