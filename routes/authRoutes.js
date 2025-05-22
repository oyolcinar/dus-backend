/**
 * Authentication routes for Supabase integration with OAuth support
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
 * /api/auth/oauth/{provider}:
 *   get:
 *     summary: Start OAuth flow
 *     tags: [Authentication]
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, apple, facebook]
 *         description: OAuth provider name
 *     responses:
 *       200:
 *         description: OAuth URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *       400:
 *         description: Invalid provider or OAuth setup error
 *       500:
 *         description: Server error
 */
router.get('/oauth/:provider', authController.startOAuth);

/**
 * @swagger
 * /api/auth/oauth/callback:
 *   get:
 *     summary: Handle OAuth callback
 *     tags: [Authentication]
 *     parameters:
 *       - name: code
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from OAuth provider
 *       - name: state
 *         in: query
 *         schema:
 *           type: string
 *         description: State parameter for security
 *       - name: provider
 *         in: query
 *         schema:
 *           type: string
 *         description: OAuth provider name
 *       - name: error
 *         in: query
 *         schema:
 *           type: string
 *         description: Error code if OAuth failed
 *       - name: error_description
 *         in: query
 *         schema:
 *           type: string
 *         description: Error description if OAuth failed
 *     responses:
 *       302:
 *         description: Redirect to frontend with session token or error
 *       400:
 *         description: OAuth authentication failed
 *       500:
 *         description: Server error
 */
router.get('/oauth/callback', authController.oauthCallback);

/**
 * @swagger
 * /api/auth/apple:
 *   post:
 *     summary: Apple Sign In with ID token (for mobile apps)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_token
 *             properties:
 *               id_token:
 *                 type: string
 *                 description: Apple ID token from native Sign In with Apple
 *               nonce:
 *                 type: string
 *                 description: Nonce used in Apple Sign In (recommended)
 *               user:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                   email:
 *                     type: string
 *                 description: User info from Apple (only available on first sign in)
 *     responses:
 *       200:
 *         description: Apple Sign In successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                 session:
 *                   type: object
 *       400:
 *         description: Invalid Apple ID token
 *       500:
 *         description: Server error
 */
router.post('/apple', authController.appleSignIn);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
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
 *                 description: Email address to send reset link to
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
 *         description: Invalid input or weak password
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/update-password', authSupabase, authController.updatePassword);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token from previous authentication
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 session:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid refresh token
 *       500:
 *         description: Server error
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     subscriptionType:
 *                       type: string
 *                     dateRegistered:
 *                       type: string
 *                       format: date-time
 *                     totalDuels:
 *                       type: integer
 *                     duelsWon:
 *                       type: integer
 *                     duelsLost:
 *                       type: integer
 *                     totalStudyTime:
 *                       type: integer
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/me', authSupabase, authController.getCurrentUser);

module.exports = router;
