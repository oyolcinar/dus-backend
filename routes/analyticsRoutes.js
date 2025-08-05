const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authSupabase } = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Enhanced study analytics with streaks, progress charts, and comparative metrics
 */

// ===============================
// STREAK ANALYTICS ROUTES
// ===============================

/**
 * @swagger
 * /api/analytics/streaks/longest:
 *   get:
 *     summary: Get user's longest study streaks by topic and course
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Longest streaks data
 */
router.get(
  '/streaks/longest',
  authSupabase,
  analyticsController.getUserLongestStreaks,
);

/**
 * @swagger
 * /api/analytics/streaks/summary:
 *   get:
 *     summary: Get user's streaks summary with key metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Streaks summary data
 */
router.get(
  '/streaks/summary',
  authSupabase,
  analyticsController.getUserStreaksSummary,
);

/**
 * @swagger
 * /api/analytics/streaks/analytics:
 *   get:
 *     summary: Get detailed streaks analytics from view
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed streaks analytics
 */
router.get(
  '/streaks/analytics',
  authSupabase,
  analyticsController.getLongestStreaksAnalytics,
);

// ===============================
// PROGRESS ANALYTICS ROUTES
// ===============================

/**
 * @swagger
 * /api/analytics/progress/daily:
 *   get:
 *     summary: Get user's daily progress data for charts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days back if dates not provided
 *     responses:
 *       200:
 *         description: Daily progress data
 */
router.get(
  '/progress/daily',
  authSupabase,
  analyticsController.getUserDailyProgress,
);

/**
 * @swagger
 * /api/analytics/progress/weekly:
 *   get:
 *     summary: Get user's weekly progress data for charts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weeksBack
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of weeks back to retrieve
 *     responses:
 *       200:
 *         description: Weekly progress data
 */
router.get(
  '/progress/weekly',
  authSupabase,
  analyticsController.getUserWeeklyProgress,
);

/**
 * @swagger
 * /api/analytics/progress/daily-analytics:
 *   get:
 *     summary: Get daily progress analytics from view
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days back
 *     responses:
 *       200:
 *         description: Daily progress analytics
 */
router.get(
  '/progress/daily-analytics',
  authSupabase,
  analyticsController.getDailyProgressAnalytics,
);

/**
 * @swagger
 * /api/analytics/progress/weekly-analytics:
 *   get:
 *     summary: Get weekly progress analytics from view
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of weeks back
 *     responses:
 *       200:
 *         description: Weekly progress analytics
 */
router.get(
  '/progress/weekly-analytics',
  authSupabase,
  analyticsController.getWeeklyProgressAnalytics,
);

// ===============================
// COURSE ANALYTICS ROUTES
// ===============================

/**
 * @swagger
 * /api/analytics/courses/top:
 *   get:
 *     summary: Get user's top courses by time spent (study sessions + duels)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of courses to return
 *     responses:
 *       200:
 *         description: Top courses by time spent
 */
router.get('/courses/top', authSupabase, analyticsController.getUserTopCourses);

/**
 * @swagger
 * /api/analytics/courses/most-studied:
 *   get:
 *     summary: Get most time spent course details
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Most studied course data
 */
router.get(
  '/courses/most-studied',
  authSupabase,
  analyticsController.getMostTimeSpentCourse,
);

/**
 * @swagger
 * /api/analytics/courses/analytics:
 *   get:
 *     summary: Get comprehensive course analytics from view
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Course analytics data
 */
router.get(
  '/courses/analytics',
  authSupabase,
  analyticsController.getMostTimeSpentCourseAnalytics,
);

// ===============================
// COMPARATIVE ANALYTICS ROUTES
// ===============================

/**
 * @swagger
 * /api/analytics/comparative:
 *   get:
 *     summary: Get user performance compared to platform average
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comparative analytics data
 */
router.get(
  '/comparative',
  authSupabase,
  analyticsController.getUserComparativeAnalytics,
);

/**
 * @swagger
 * /api/analytics/recent-activity:
 *   get:
 *     summary: Get user's recent activity summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysBack
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days back to analyze
 *     responses:
 *       200:
 *         description: Recent activity summary
 */
router.get(
  '/recent-activity',
  authSupabase,
  analyticsController.getUserRecentActivity,
);

// ===============================
// DASHBOARD ANALYTICS ROUTES
// ===============================

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics data
 */
router.get(
  '/dashboard',
  authSupabase,
  analyticsController.getUserDashboardAnalytics,
);

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Get analytics summary with key metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary
 */
router.get(
  '/summary',
  authSupabase,
  analyticsController.getUserAnalyticsSummary,
);

/**
 * @swagger
 * /api/analytics/all:
 *   get:
 *     summary: Get comprehensive analytics data in one call
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysBack
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Days back for daily progress
 *       - in: query
 *         name: weeksBack
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Weeks back for weekly progress
 *     responses:
 *       200:
 *         description: Comprehensive analytics data
 */
router.get('/all', authSupabase, analyticsController.getAllUserAnalytics);

// ===============================
// LEGACY COMPATIBILITY ROUTES
// ===============================

/**
 * @swagger
 * /api/analytics/user-performance:
 *   get:
 *     summary: Get user performance analytics (legacy endpoint)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User performance data
 */
router.get(
  '/user-performance',
  authSupabase,
  analyticsController.getUserPerformanceAnalytics,
);

/**
 * @swagger
 * /api/analytics/dashboard-legacy:
 *   get:
 *     summary: Legacy dashboard endpoint for backward compatibility
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Legacy dashboard data
 */
router.get(
  '/dashboard-legacy',
  authSupabase,
  analyticsController.getUserDashboard,
);

module.exports = router;
