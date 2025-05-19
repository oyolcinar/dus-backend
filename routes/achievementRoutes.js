const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
// Replace the old auth middleware with the new ones
const authSupabase = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Achievements
 *   description: Achievement management
 */

// --- Admin/Management Routes for creating achievements ---
/**
 * @swagger
 * /api/achievements:
 *   post:
 *     summary: Create a new achievement (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - requirements
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: object
 *     responses:
 *       201:
 *         description: Achievement created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post(
  '/',
  authSupabase,
  authorizePermission('manage_achievements'), // Assuming this middleware checks for admin role/permission
  achievementController.create,
);

// --- Publicly accessible routes or general information routes ---
/**
 * @swagger
 * /api/achievements:
 *   get:
 *     summary: Get all achievements
 *     tags: [Achievements]
 *     responses:
 *       200:
 *         description: List of achievements
 */
// This is publicly accessible, no auth needed
router.get('/', achievementController.getAll);

// --- Specific string-based routes before parameterized routes ---

/**
 * @swagger
 * /api/achievements/user:
 *   get:
 *     summary: Get current user's achievements
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's achievements
 *       401:
 *         description: Unauthorized
 */
router.get('/user', authSupabase, achievementController.getUserAchievements); // MOVED UP

/**
 * @swagger
 * /api/achievements/award:
 *   post:
 *     summary: Award achievement to user (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - achievementId
 *             properties:
 *               userId:
 *                 type: integer
 *               achievementId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Achievement awarded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Achievement or user not found
 */
router.post(
  '/award', // MOVED UP (relative to where a /:id might have been if it also handled POST)
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.awardAchievement,
);

// Add any other specific string routes here before the /:id routes
// e.g., /api/achievements/user/progress, /api/achievements/check, etc. if they exist

// --- Parameterized routes (like /:id) come after more specific string routes ---

/**
 * @swagger
 * /api/achievements/{id}:
 *   get:
 *     summary: Get achievement by ID
 *     tags: [Achievements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement details
 *       404:
 *         description: Achievement not found
 */
// This is publicly accessible, no auth needed
router.get('/:id', achievementController.getById); // This will now only catch actual IDs

/**
 * @swagger
 * /api/achievements/{id}:
 *   put:
 *     summary: Update an achievement (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: object
 *     responses:
 *       200:
 *         description: Achievement updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Achievement not found
 */
router.put(
  '/:id',
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.update,
);

/**
 * @swagger
 * /api/achievements/{id}:
 *   delete:
 *     summary: Delete an achievement (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Achievement not found
 */
router.delete(
  '/:id',
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.delete,
);

module.exports = router;
