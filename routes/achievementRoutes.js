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
  authorizePermission('manage_achievements'),
  achievementController.create,
);

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
router.get('/:id', achievementController.getById);

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
  '/award',
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.awardAchievement,
);

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
router.get('/user', authSupabase, achievementController.getUserAchievements);

module.exports = router;
