const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/verifyToken');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const upload = multer();

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
router.get('/admin/users', verifyToken, adminAuth, adminController.getAllUsers);

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
router.get('/admin/user/:id', verifyToken, adminAuth, adminController.getUserById);

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
router.put('/admin/user/:id', verifyToken, adminAuth, upload.single('image'), adminController.updateUser);


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
router.post('/admin/user/block', verifyToken, adminAuth, adminController.blockUser);

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
router.delete('/admin/user/:userId', verifyToken, adminAuth, adminController.deleteUser);

/**
 * @swagger
 * /api/admin/platform-stats:
 *   get:
 *     summary: Get platform statistics (total users, total posts, top visited country/city)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform stats fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 totalPosts:
 *                   type: integer
 *                 topVisitedCountry:
 *                   type: string
 *                 topVisitedCity:
 *                   type: string
 *       500:
 *         description: Failed to fetch platform stats
 */
router.get('/admin/platform-stats', verifyToken, adminAuth, adminController.getPlatformStats);

/**
 * @swagger
 * /api/admin/most-visited-countries:
 *   get:
 *     summary: Get most visited countries with number of unique users who visited them
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: integer
 *           enum: [1, 2]
 *         description: 1 = all, 2 = top 5 only
 *     responses:
 *       200:
 *         description: Most visited countries fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   value:
 *                     type: integer
 *       500:
 *         description: Failed to fetch most visited countries
 */
router.get('/admin/most-visited-countries', verifyToken, adminAuth, adminController.getMostVisitedCountries);

/**
 * @swagger
 * /api/admin/user:
 *   post:
 *     summary: Create a new admin user
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - password
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin user created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to create admin user
 */
router.post('/admin/user', verifyToken, adminAuth, adminController.createAdminUser);

/**
 * @swagger
 * /api/admin/admin-users:
 *   get:
 *     summary: Get all admin users (paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 10)
 *     responses:
 *       200:
 *         description: Admin users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 adminUsers:
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
 *                       createdAt:
 *                         type: integer
 *                       updatedAt:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       500:
 *         description: Failed to fetch admin users
 */
router.get('/admin/admin-users', verifyToken, adminAuth, adminController.getAllAdminUsers);

/**
 * @swagger
 * /api/admin/admin-user/{id}:
 *   put:
 *     summary: Edit an admin user (only provided fields)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Admin user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin user updated successfully
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Failed to update admin user
 */
router.put('/admin/admin-user/:id', verifyToken, adminAuth, adminController.editAdminUser);

/**
 * @swagger
 * /api/admin/admin-user/{id}:
 *   delete:
 *     summary: Delete an admin user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin user deleted successfully
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Failed to delete admin user
 */
router.delete('/admin/admin-user/:id', verifyToken, adminAuth, adminController.deleteAdminUser);

/**
 * @swagger
 * /api/admin/analytics/user-signups:
 *   get:
 *     summary: Get user signup analytics per month for a given year
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2024
 *         required: true
 *         description: The year for which to fetch signup data
 *     responses:
 *       200:
 *         description: User signup analytics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                   users:
 *                     type: integer
 *       400:
 *         description: Invalid year provided
 *       500:
 *         description: Failed to fetch user signup analytics
 */
router.get('/admin/analytics/user-signups', verifyToken, adminAuth, adminController.getUserSignupAnalytics);

/**
 * @swagger
 * /api/admin/change-password:
 *   post:
 *     summary: Change password for the logged-in admin user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Failed to change password
 */
router.post('/admin/change-password', verifyToken, adminAuth, adminController.changeAdminPassword);

/**
 * @swagger
 * /api/admin/profile:
 *   put:
 *     summary: Edit admin profile (full name, email, image)
 *     tags: [Admin]
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
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       404:
 *         description: Admin user not found
 *       500:
 *         description: Failed to update admin profile
 */
router.put('/admin/profile', verifyToken, adminAuth, upload.single('image'), adminController.editAdminProfile);

/**
 * @swagger
 * /api/admin/create-default-admin:
 *   post:
 *     summary: Create a default admin user and get JWT token (for setup/testing)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Default admin created and token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     admin:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         full_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         image:
 *                           type: string
 *                         createdAt:
 *                           type: integer
 *                         updatedAt:
 *                           type: integer
 *       500:
 *         description: Failed to create default admin and generate token
 */
router.post('/admin/create-default-admin', adminController.createDefaultAdminAndGetToken);

module.exports = router;