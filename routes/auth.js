const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');

/**
 * @swagger
 * /api/auth/terms:
 *   post:
 *     summary: Accept or reject terms and conditions
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
 *               accepted:
 *                 type: boolean
 *                 description: true to accept, false to reject
 *     responses:
 *       200:
 *         description: Terms updated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/terms', verifyToken, authController.acceptTerms);

module.exports = router;