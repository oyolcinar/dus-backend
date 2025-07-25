const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authSupabase = require('../middleware/authSupabase');

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 streaks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       streak_type:
 *                         type: string
 *                         enum: [topic, course, daily_study]
 *                       topic_title:
 *                         type: string
 *                       course_title:
 *                         type: string
 *                       longest_streak_seconds:
 *                         type: integer
 *                       longest_streak_minutes:
 *                         type: number
 *                       longest_streak_hours:
 *                         type: number
 *                       longest_streak_date:
 *                         type: string
 *                         format: date
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 longest_single_session_minutes:
 *                   type: number
 *                 longest_single_session_topic:
 *                   type: string
 *                 longest_single_session_course:
 *                   type: string
 *                 longest_topic_streak_minutes:
 *                   type: number
 *                 longest_course_streak_minutes:
 *                   type: number
 *       401:
 *         description: Unauthorized
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
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dailyProgress:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       study_date:
 *                         type: string
 *                         format: date
 *                       daily_study_minutes:
 *                         type: number
 *                       daily_sessions:
 *                         type: integer
 *                       daily_topics_studied:
 *                         type: integer
 *                       daily_questions_answered:
 *                         type: integer
 *                       daily_accuracy_percentage:
 *                         type: number
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 weeklyProgress:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       week_start:
 *                         type: string
 *                         format: date
 *                       week_end:
 *                         type: string
 *                         format: date
 *                       weekly_study_hours:
 *                         type: number
 *                       weekly_sessions:
 *                         type: integer
 *                       weekly_topics_studied:
 *                         type: integer
 *                       weekly_consistency_percentage:
 *                         type: number
 *                       weekly_accuracy_percentage:
 *                         type: number
 *       401:
 *         description: Unauthorized
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
 *       401:
 *         description: Unauthorized
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
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topCourses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       course_id:
 *                         type: integer
 *                       course_title:
 *                         type: string
 *                       total_time_hours:
 *                         type: number
 *                       study_session_hours:
 *                         type: number
 *                       duel_hours:
 *                         type: number
 *                       topics_studied:
 *                         type: integer
 *                       accuracy_percentage:
 *                         type: number
 *                       rank:
 *                         type: integer
 *       401:
 *         description: Unauthorized
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
 *       401:
 *         description: Unauthorized
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
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comparison:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       metric_name:
 *                         type: string
 *                       user_value:
 *                         type: number
 *                       platform_average:
 *                         type: number
 *                       user_rank:
 *                         type: integer
 *                       total_users:
 *                         type: integer
 *                       percentile:
 *                         type: number
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   period_name:
 *                     type: string
 *                   total_study_minutes:
 *                     type: number
 *                   total_sessions:
 *                     type: integer
 *                   unique_topics:
 *                     type: integer
 *                   unique_courses:
 *                     type: integer
 *                   total_questions:
 *                     type: integer
 *                   accuracy_percentage:
 *                     type: number
 *                   consistency_days:
 *                     type: integer
 *                   best_day:
 *                     type: string
 *                   best_day_minutes:
 *                     type: number
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_study_hours:
 *                   type: number
 *                 total_sessions:
 *                   type: integer
 *                 unique_topics_studied:
 *                   type: integer
 *                 unique_courses_studied:
 *                   type: integer
 *                 longest_session_minutes:
 *                   type: number
 *                 average_session_minutes:
 *                   type: number
 *                 current_streak_days:
 *                   type: integer
 *                 longest_streak_days:
 *                   type: integer
 *                 most_studied_course:
 *                   type: string
 *                 most_studied_topic:
 *                   type: string
 *                 last_study_date:
 *                   type: string
 *                 last_7_days_hours:
 *                   type: number
 *                 last_30_days_hours:
 *                   type: number
 *       401:
 *         description: Unauthorized
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
 *       401:
 *         description: Unauthorized
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dashboard:
 *                   type: object
 *                   description: Dashboard analytics
 *                 summary:
 *                   type: object
 *                   description: Summary analytics
 *                 longestStreaks:
 *                   type: array
 *                   description: Longest streaks data
 *                 dailyProgress:
 *                   type: array
 *                   description: Daily progress data
 *                 weeklyProgress:
 *                   type: array
 *                   description: Weekly progress data
 *                 topCourses:
 *                   type: array
 *                   description: Top courses data
 *                 comparative:
 *                   type: array
 *                   description: Comparative analytics
 *                 recentActivity:
 *                   type: array
 *                   description: Recent activity summary
 *       401:
 *         description: Unauthorized
 */
router.get('/all', authSupabase, analyticsController.getAllUserAnalytics);

// ===============================
// LEGACY COMPATIBILITY ROUTES
// ===============================

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
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/dashboard-legacy',
  authSupabase,
  analyticsController.getUserDashboard,
);

module.exports = router;
