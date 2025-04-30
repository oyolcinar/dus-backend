/**
 * Authentication routes for Supabase integration
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user with Supabase auth
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with Supabase auth
 *     tags: [Authentication]
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
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/signout:
 *   post:
 *     summary: Sign out a user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully signed out
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/signout', authSupabase, authController.signOut);

/**
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     summary: Get current user's role and permissions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User permissions
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User role data not found
 *       500:
 *         description: Server error
 */
router.get('/permissions', authSupabase, authController.getUserPermissions);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent (if email exists)
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/reset-password', authController.requestPasswordReset);

/**
 * @swagger
 * /api/auth/update-password:
 *   post:
 *     summary: Update password after reset
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: New password, minimum 8 characters
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/update-password', authSupabase, authController.updatePassword);

module.exports = router;