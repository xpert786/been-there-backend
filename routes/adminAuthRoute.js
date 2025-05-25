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

module.exports = router;