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
router.get('/user', authSupabase, achievementController.getUserAchievements);

/**
 * @swagger
 * /api/achievements/user/progress:
 *   get:
 *     summary: Get current user's achievement progress
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's achievement progress with percentages and requirements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 progress:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       achievement_id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       overall_progress:
 *                         type: integer
 *                         description: Overall progress percentage
 *                       requirements:
 *                         type: object
 *                         description: Individual requirement progress
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user/progress',
  authSupabase,
  achievementController.getUserProgress,
);

/**
 * @swagger
 * /api/achievements/user/check:
 *   post:
 *     summary: Manually check current user's achievements
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Achievement check completed with any new achievements awarded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 newAchievements:
 *                   type: integer
 *                 achievements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/user/check',
  authSupabase,
  achievementController.checkUserAchievements,
);

/**
 * @swagger
 * /api/achievements/user/stats:
 *   get:
 *     summary: Get current user's statistics
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's comprehensive statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     distinct_study_days:
 *                       type: integer
 *                     total_duels:
 *                       type: integer
 *                     duels_won:
 *                       type: integer
 *                     current_study_streak:
 *                       type: integer
 *                     weekly_champion_count:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/user/stats', authSupabase, achievementController.getUserStats);

/**
 * @swagger
 * /api/achievements/trigger:
 *   post:
 *     summary: Trigger achievement check after specific action
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
 *               - actionType
 *             properties:
 *               actionType:
 *                 type: string
 *                 enum: [study_session_completed, duel_completed, user_registered]
 *                 description: Type of action that occurred
 *     responses:
 *       200:
 *         description: Achievement check triggered successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/trigger',
  authSupabase,
  achievementController.triggerAchievementCheck,
);

/**
 * @swagger
 * /api/achievements/leaderboard:
 *   get:
 *     summary: Get achievement leaderboard
 *     tags: [Achievements]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top users to return
 *     responses:
 *       200:
 *         description: Achievement leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       achievement_count:
 *                         type: integer
 */
router.get('/leaderboard', achievementController.getLeaderboard);

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
 * /api/achievements/bulk-check:
 *   post:
 *     summary: Bulk check achievements for multiple users (admin only)
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of user IDs to check
 *     responses:
 *       200:
 *         description: Bulk achievement check completed
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post(
  '/bulk-check',
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.bulkCheckAchievements,
);

/**
 * @swagger
 * /api/achievements/check-all:
 *   post:
 *     summary: Check achievements for all users (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of users to check
 *     responses:
 *       200:
 *         description: All users achievement check completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post(
  '/check-all',
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.checkAllUsersAchievements,
);

/**
 * @swagger
 * /api/achievements/stats:
 *   get:
 *     summary: Get achievement statistics (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Achievement statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalAchievements:
 *                       type: integer
 *                     totalUserAchievements:
 *                       type: integer
 *                     recentAchievements:
 *                       type: integer
 *                     averageAchievementsPerUser:
 *                       type: number
 *                     distribution:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
  '/stats',
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.getAchievementStats,
);

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
router.get('/:id', achievementController.getById);

/**
 * @swagger
 * /api/achievements/{userId}/stats:
 *   get:
 *     summary: Get user statistics by ID (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 */
router.get(
  '/:userId/stats',
  authSupabase,
  authorizePermission('manage_achievements'),
  achievementController.getUserStats,
);

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
