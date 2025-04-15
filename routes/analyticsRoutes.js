const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: User learning analytics
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get user dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User dashboard analytics
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', authMiddleware, analyticsController.getUserDashboard);

/**
 * @swagger
 * /api/analytics/weekly-progress:
 *   get:
 *     summary: Get user's weekly progress
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's weekly progress
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/weekly-progress',
  authMiddleware,
  analyticsController.getWeeklyProgress,
);

/**
 * @swagger
 * /api/analytics/topics:
 *   get:
 *     summary: Get topic-based analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topic-based analytics
 *       401:
 *         description: Unauthorized
 */
router.get('/topics', authMiddleware, analyticsController.getTopicAnalytics);

module.exports = router;
