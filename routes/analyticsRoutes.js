// routes/analyticsRoutes.js - Only adding the missing routes

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
// Replace the old auth middleware with the new one
const authSupabase = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

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
router.get('/dashboard', authSupabase, analyticsController.getUserDashboard);

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
  authSupabase,
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
router.get('/topics', authSupabase, analyticsController.getTopicAnalytics);

/**
 * @swagger
 * /api/analytics/admin/overview:
 *   get:
 *     summary: Get admin analytics overview (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin analytics overview
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
  '/admin/overview',
  authSupabase,
  authorizePermission('view_analytics'),
  analyticsController.getAdminAnalyticsOverview,
);

/**
 * @swagger
 * /api/analytics/admin/user-performance:
 *   get:
 *     summary: Get user performance analytics (admin/instructor only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Optional user ID to filter by specific user
 *     responses:
 *       200:
 *         description: User performance analytics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
  '/admin/user-performance',
  authSupabase,
  authorizePermission('view_analytics'),
  analyticsController.getUserPerformanceAnalytics,
);

// NEW ROUTES NEEDED BY FRONTEND
/**
 * @swagger
 * /api/analytics/user-performance:
 *   get:
 *     summary: Get user performance analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User performance analytics
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user-performance',
  authSupabase,
  analyticsController.getUserPerformance,
);

/**
 * @swagger
 * /api/analytics/activity:
 *   get:
 *     summary: Get user activity timeline
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to retrieve data for (default: 7)
 *     responses:
 *       200:
 *         description: User activity timeline
 *       401:
 *         description: Unauthorized
 */
router.get('/activity', authSupabase, analyticsController.getActivityTimeline);

/**
 * @swagger
 * /api/analytics/weakest-topics:
 *   get:
 *     summary: Get user's weakest topics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of topics to return (default: 5)
 *     responses:
 *       200:
 *         description: User's weakest topics
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/weakest-topics',
  authSupabase,
  analyticsController.getWeakestTopics,
);

/**
 * @swagger
 * /api/analytics/improvement:
 *   get:
 *     summary: Get user improvement metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User improvement metrics
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/improvement',
  authSupabase,
  analyticsController.getImprovementMetrics,
);

/**
 * @swagger
 * /api/analytics/study-time-distribution:
 *   get:
 *     summary: Get distribution of study time
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Study time distribution
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/study-time-distribution',
  authSupabase,
  analyticsController.getStudyTimeDistribution,
);

module.exports = router;
