const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authSupabase } = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Course-based study analytics with streaks, progress charts, and comparative metrics
 */

// ===============================
// STREAK ANALYTICS ROUTES (Course-Based)
// ===============================

/**
 * @swagger
 * /api/analytics/streaks/longest:
 *   get:
 *     summary: Get user's longest study streaks by course
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Longest streaks data by course
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
 *                         example: "course"
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
 *                       total_sessions:
 *                         type: integer
 *                       total_study_seconds:
 *                         type: integer
 *                       average_session_seconds:
 *                         type: integer
 *                 overallLongestSession:
 *                   type: object
 *                   properties:
 *                     seconds:
 *                       type: integer
 *                     minutes:
 *                       type: number
 *                     hours:
 *                       type: number
 *                     course:
 *                       type: string
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
 *                 longest_single_session_course:
 *                   type: string
 *                   nullable: true
 *                 current_streak_days:
 *                   type: integer
 *                 longest_streak_days:
 *                   type: integer
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
 *     summary: Get detailed streaks analytics (alias for longest streaks)
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
// PROGRESS ANALYTICS ROUTES (Course-Based)
// ===============================

/**
 * @swagger
 * /api/analytics/progress/daily:
 *   get:
 *     summary: Get user's daily progress data for charts (course-based)
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
 *                       daily_break_minutes:
 *                         type: number
 *                       daily_sessions:
 *                         type: integer
 *                       daily_courses_studied:
 *                         type: integer
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
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
 *     summary: Get user's weekly progress data for charts (course-based)
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
 *                       weekly_break_hours:
 *                         type: number
 *                       weekly_sessions:
 *                         type: integer
 *                       weekly_courses_studied:
 *                         type: integer
 *                       weekly_study_days:
 *                         type: integer
 *                       weekly_consistency_percentage:
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
 *     summary: Get daily progress analytics (alias)
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
 *     summary: Get weekly progress analytics (alias)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weeksBack
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
 *     summary: Get user's top courses by time spent
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
 *                       rank:
 *                         type: integer
 *                       course_id:
 *                         type: integer
 *                       course_title:
 *                         type: string
 *                       course_type:
 *                         type: string
 *                       total_time_hours:
 *                         type: number
 *                       study_session_hours:
 *                         type: number
 *                       break_hours:
 *                         type: number
 *                       total_sessions:
 *                         type: integer
 *                       completion_percentage:
 *                         type: number
 *                       is_completed:
 *                         type: boolean
 *                       last_studied_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       difficulty_rating:
 *                         type: integer
 *                         nullable: true
 *                       tekrar_sayisi:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mostStudiedCourse:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     course_id:
 *                       type: integer
 *                     course_title:
 *                       type: string
 *                     course_type:
 *                       type: string
 *                     total_time_hours:
 *                       type: number
 *                     study_session_hours:
 *                       type: number
 *                     break_hours:
 *                       type: number
 *                     total_sessions:
 *                       type: integer
 *                     completion_percentage:
 *                       type: number
 *                     is_completed:
 *                       type: boolean
 *                     time_rank:
 *                       type: integer
 *                     last_studied_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
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
 *     summary: Get comprehensive course analytics (alias)
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
 *     summary: Get user's recent activity summary (course-based)
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
 *                   total_break_minutes:
 *                     type: number
 *                   total_sessions:
 *                     type: integer
 *                   unique_courses:
 *                     type: integer
 *                   consistency_days:
 *                     type: integer
 *                   best_day:
 *                     type: string
 *                     format: date
 *                     nullable: true
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
 *     summary: Get comprehensive dashboard analytics (course-based)
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
 *                 unique_courses_studied:
 *                   type: integer
 *                 courses_completed:
 *                   type: integer
 *                 longest_session_minutes:
 *                   type: number
 *                 average_session_minutes:
 *                   type: number
 *                 current_streak_days:
 *                   type: integer
 *                 most_studied_course:
 *                   type: string
 *                   nullable: true
 *                 last_study_date:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                 last_7_days_hours:
 *                   type: number
 *                 last_30_days_hours:
 *                   type: number
 *                 courses_studied_this_week:
 *                   type: integer
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
 *     summary: Get analytics summary with key metrics (course-based)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                 total_study_time_hours:
 *                   type: number
 *                 total_sessions:
 *                   type: integer
 *                 average_session_duration:
 *                   type: number
 *                 unique_courses_count:
 *                   type: integer
 *                 courses_completed_count:
 *                   type: integer
 *                 longest_streak_minutes:
 *                   type: number
 *                 current_streak_days:
 *                   type: integer
 *                 total_break_time_hours:
 *                   type: number
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
 *     summary: Get comprehensive analytics data in one call (course-based)
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
 *                   description: Dashboard analytics data
 *                 summary:
 *                   type: object
 *                   description: Analytics summary
 *                 longestStreaks:
 *                   type: array
 *                   description: Longest streaks by course
 *                 dailyProgress:
 *                   type: array
 *                   description: Daily progress data
 *                 weeklyProgress:
 *                   type: array
 *                   description: Weekly progress data
 *                 topCourses:
 *                   type: array
 *                   description: Top courses by time spent
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
 * /api/analytics/user-performance:
 *   get:
 *     summary: Get user performance analytics (legacy endpoint - course-based)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User performance data (course-based)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coursePerformance:
 *                   type: array
 *                   description: Course-based performance data
 *                 totalQuestionsAnswered:
 *                   type: integer
 *                 overallAccuracy:
 *                   type: number
 *                 studyTime:
 *                   type: integer
 *                 studySessions:
 *                   type: integer
 *                 averageSessionDuration:
 *                   type: integer
 *                 totalCourses:
 *                   type: integer
 *                 completedCourses:
 *                   type: integer
 *       401:
 *         description: Unauthorized
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
 *     summary: Legacy dashboard endpoint for backward compatibility (course-based)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Legacy dashboard data (course-based)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recentStudyTime:
 *                   type: integer
 *                 recentStudyTimeHours:
 *                   type: number
 *                 dailyStudyTime:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       study_date:
 *                         type: string
 *                         format: date
 *                       total_duration:
 *                         type: integer
 *                 courseAnalytics:
 *                   type: array
 *                   description: Course-specific analytics data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/dashboard-legacy',
  authSupabase,
  analyticsController.getUserDashboard,
);

// ===============================
// DEPRECATED TOPIC-BASED ENDPOINTS
// ===============================

/**
 * @deprecated Topic-based analytics have been migrated to course-based analytics
 */
router.get('/topics/most-studied', authSupabase, (req, res) => {
  res.status(410).json({
    message: 'Topic-based analytics have been deprecated.',
    suggestion:
      'Use course-based analytics instead: GET /api/analytics/courses/top',
    migration:
      'Analytics are now calculated at the course level instead of topic level.',
  });
});

/**
 * @deprecated Topic-based time analytics have been migrated to course-based analytics
 */
router.get('/topics/time-spent', authSupabase, (req, res) => {
  res.status(410).json({
    message: 'Topic-based time analytics have been deprecated.',
    suggestion:
      'Use course-based analytics instead: GET /api/analytics/courses/most-studied',
    migration: 'Time tracking is now aggregated at the course level.',
  });
});

/**
 * @deprecated Topic-based progress analytics have been migrated to course-based analytics
 */
router.get('/topics/progress', authSupabase, (req, res) => {
  res.status(410).json({
    message: 'Topic-based progress analytics have been deprecated.',
    suggestion:
      'Use course-based progress analytics instead: GET /api/analytics/progress/daily or /api/analytics/progress/weekly',
    migration:
      'Progress tracking and analytics are now handled at the course level.',
  });
});

/**
 * @deprecated Subtopic analytics have been deprecated in favor of course-based analytics
 */
router.get('/subtopics/*', authSupabase, (req, res) => {
  res.status(410).json({
    message: 'Subtopic-based analytics have been deprecated.',
    suggestion:
      'Use course-based analytics instead: GET /api/analytics/courses/top',
    migration:
      'The system no longer tracks analytics at the subtopic level. All analytics are now course-based.',
  });
});

module.exports = router;
