const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('password')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
    .matches(/\d/).withMessage('New password must contain at least one numeric character')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('New password must contain at least one special character'),
  body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', verifyToken, authController.getProfile);

/**
 * @swagger
 * /auth/changePassword:
 *   post:
 *     summary: Change the user's password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               current_password:
 *                 type: string
 *                 description: Current password of the user
 *               new_password:
 *                 type: string
 *                 description: New password to be set
 *               confirm_password:
 *                 type: string
 *                 description: Confirmation of the new password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/changePassword',
  verifyToken,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
      .matches(/\d/).withMessage('New password must contain at least one numeric character')
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('New password must contain at least one special character'),
    body('confirm_password').notEmpty().withMessage('Confirm password is required'),
  ],
  authController.changePassword
);

/**
 * @swagger
 * /auth/sendOtp:
 *   post:
 *     summary: Send OTP for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the user
 *     responses:
 *       200:
 *         description: OTP and reset token sent successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/sendOtp', authController.sendOtp);

/**
 * @swagger
 * /auth/resendOtp:
 *   post:
 *     summary: Resend OTP for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the user
 *     responses:
 *       200:
 *         description: New OTP and reset token sent successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/resendOtp', authController.resendOtp);

/**
 * @swagger
 * /auth/verifyOtp:
 *   post:
 *     summary: Verify OTP for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *                 description: OTP received by the user
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resetToken:
 *                   type: string
 *                   description: Token to reset the password
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Internal server error
 */
router.post('/verifyOtp', authController.verifyOtp);

/**
 * @swagger
 * /auth/resetPassword:
 *   post:
 *     summary: Reset password using verified reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: Token received after OTP verification
 *               new_password:
 *                 type: string
 *                 description: New password to be set
 *               confirm_password:
 *                 type: string
 *                 description: Confirmation of the new password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/resetPassword', authController.resetPassword);

/**
 * @swagger
 * /auth/editProfile:
 *   put:
 *     summary: Edit user profile (only update provided fields)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               public_profile:
 *                 type: boolean
 *               location_sharing:
 *                 type: boolean
 *               message_request:
 *                 type: boolean
 *               instagram_sync:
 *                 type: boolean
 *               contact_sync:
 *                 type: boolean
 *               notification_type:
 *                 type: string
 *                 description: Comma separated notification type ids (e.g. "1,2,3")
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/editProfile', verifyToken, authController.editProfile);

/**
 * @swagger
 * /auth/syncContacts:
 *   post:
 *     summary: Sync user contacts and show which users are in the app and follow status
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contacts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of phone numbers to sync
 *     responses:
 *       200:
 *         description: Synced contacts with follow status
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/syncContacts', verifyToken, authController.syncContacts);

/**
 * @swagger
 * /auth/deleteAccount:
 *   delete:
 *     summary: Delete the authenticated user's account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/deleteAccount', verifyToken, authController.deleteAccount);

module.exports = router;
