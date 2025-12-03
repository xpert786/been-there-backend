const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminAuthController');

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Login as an admin user
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin login successful
 *       401:
 *         description: Invalid email or password
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to login admin user
 */
router.post('/login', adminController.loginAdminUser);

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
router.post('/create-default-admin', adminController.createDefaultAdminAndGetToken);

module.exports = router;