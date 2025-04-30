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

module.exports = router;
