// routes/analyticsRoutes.js - Complete with enhanced topic support and answer explanations

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
 *   description: User learning analytics with enhanced topic support
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
 *         description: User dashboard analytics with enhanced topic data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recentStudyTime:
 *                   type: integer
 *                   description: Recent study time in seconds
 *                 recentStudyTimeHours:
 *                   type: number
 *                   description: Recent study time in hours
 *                 dailyStudyTime:
 *                   type: array
 *                   description: Daily study time for the past week
 *                 duelStats:
 *                   type: object
 *                   properties:
 *                     totalDuels:
 *                       type: integer
 *                     wins:
 *                       type: integer
 *                     losses:
 *                       type: integer
 *                     winRate:
 *                       type: string
 *                 problematicTopics:
 *                   type: array
 *                   description: Topics with highest error rates
 *                 topicAnalytics:
 *                   type: array
 *                   description: Top 5 most studied topics with analytics including test performance
 *                   items:
 *                     type: object
 *                     properties:
 *                       topicId:
 *                         type: integer
 *                       topicTitle:
 *                         type: string
 *                       totalDuration:
 *                         type: integer
 *                       totalDurationHours:
 *                         type: number
 *                       accuracyRate:
 *                         type: string
 *                       correctAnswers:
 *                         type: integer
 *                       totalAttempts:
 *                         type: integer
 *                       testAccuracy:
 *                         type: string
 *                         description: Test-specific accuracy rate
 *                       testsTaken:
 *                         type: integer
 *                         description: Number of tests taken for this topic
 *                       avgTestScore:
 *                         type: string
 *                         description: Average test score for this topic
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
 *                       date:
 *                         type: string
 *                         format: date
 *                       totalDuration:
 *                         type: integer
 *                         description: Study time in seconds
 *                       totalDurationHours:
 *                         type: number
 *                         description: Study time in hours
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
 *     summary: Get topic-based analytics with enhanced test data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topic-based analytics including test performance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topicAnalytics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       topicId:
 *                         type: integer
 *                       topicTitle:
 *                         type: string
 *                       totalDuration:
 *                         type: integer
 *                       totalDurationHours:
 *                         type: number
 *                       accuracyRate:
 *                         type: string
 *                       correctAnswers:
 *                         type: integer
 *                       totalAttempts:
 *                         type: integer
 *                       testAccuracy:
 *                         type: string
 *                         description: Test-specific accuracy rate
 *                       testsTaken:
 *                         type: integer
 *                         description: Number of tests taken for this topic
 *                       avgTestScore:
 *                         type: string
 *                         description: Average test score for this topic
 *       401:
 *         description: Unauthorized
 */
router.get('/topics', authSupabase, analyticsController.getTopicAnalytics);

/**
 * @swagger
 * /api/analytics/test-topics:
 *   get:
 *     summary: Get test performance analytics specifically by topic
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test performance analytics by topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 testTopicAnalytics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       topic_id:
 *                         type: integer
 *                       topic_title:
 *                         type: string
 *                       test_accuracy:
 *                         type: number
 *                         description: Average test accuracy for this topic
 *                       tests_taken:
 *                         type: integer
 *                         description: Number of tests taken for this topic
 *                       avg_test_score:
 *                         type: number
 *                         description: Average test score for this topic
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/test-topics',
  authSupabase,
  analyticsController.getTestTopicAnalytics,
);

/**
 * @swagger
 * /api/analytics/user-performance:
 *   get:
 *     summary: Get user performance analytics with enhanced test data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User performance analytics including test performance by topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 branchPerformance:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       branchId:
 *                         type: integer
 *                       branchName:
 *                         type: string
 *                       averageScore:
 *                         type: number
 *                       totalQuestions:
 *                         type: integer
 *                       correctAnswers:
 *                         type: integer
 *                       testAccuracy:
 *                         type: number
 *                         description: Test-specific accuracy
 *                       testsTaken:
 *                         type: integer
 *                         description: Number of tests taken
 *                       avgTestScore:
 *                         type: number
 *                         description: Average test score
 *                 totalQuestionsAnswered:
 *                   type: integer
 *                 overallAccuracy:
 *                   type: number
 *                 studyTime:
 *                   type: integer
 *                 studySessions:
 *                   type: integer
 *                 averageSessionDuration:
 *                   type: number
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
 *           default: 7
 *         description: Number of days to retrieve data for (default 7)
 *     responses:
 *       200:
 *         description: User activity timeline
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   studyTime:
 *                     type: integer
 *                     description: Study time in seconds
 *                   questionsAnswered:
 *                     type: integer
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
 *           default: 5
 *         description: Maximum number of topics to return (default 5)
 *     responses:
 *       200:
 *         description: User's weakest topics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   topicId:
 *                     type: integer
 *                   topicName:
 *                     type: string
 *                   branchId:
 *                     type: integer
 *                   branchName:
 *                     type: string
 *                   averageScore:
 *                     type: number
 *                   totalQuestions:
 *                     type: integer
 *                   correctAnswers:
 *                     type: integer
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 previousAverage:
 *                   type: number
 *                 currentAverage:
 *                   type: number
 *                 percentageChange:
 *                   type: number
 *                 topicImprovements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       topicId:
 *                         type: integer
 *                       topicName:
 *                         type: string
 *                       previousAccuracy:
 *                         type: number
 *                       currentAccuracy:
 *                         type: number
 *                       percentageChange:
 *                         type: number
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 morning:
 *                   type: integer
 *                   description: Study time in morning (5 AM - 12 PM) in seconds
 *                 afternoon:
 *                   type: integer
 *                   description: Study time in afternoon (12 PM - 5 PM) in seconds
 *                 evening:
 *                   type: integer
 *                   description: Study time in evening (5 PM - 9 PM) in seconds
 *                 night:
 *                   type: integer
 *                   description: Study time at night (9 PM - 5 AM) in seconds
 *                 totalHours:
 *                   type: number
 *                   description: Total study time in hours
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/study-time-distribution',
  authSupabase,
  analyticsController.getStudyTimeDistribution,
);

/**
 * @swagger
 * /api/analytics/answer-explanations:
 *   get:
 *     summary: Get recent incorrect answers with explanations and topic information for learning insights
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of answers to return
 *     responses:
 *       200:
 *         description: Recent incorrect answers with explanations including topic information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 incorrectAnswers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       answerId:
 *                         type: integer
 *                       questionText:
 *                         type: string
 *                       userAnswer:
 *                         type: string
 *                       correctAnswer:
 *                         type: string
 *                       explanation:
 *                         type: string
 *                         description: Explanation of why the correct answer is correct
 *                       options:
 *                         type: object
 *                         description: Question options/choices
 *                       testTitle:
 *                         type: string
 *                       courseTitle:
 *                         type: string
 *                       topicId:
 *                         type: integer
 *                         description: ID of the topic this question belongs to
 *                       topicTitle:
 *                         type: string
 *                         description: Title of the topic this question belongs to
 *                       topicDescription:
 *                         type: string
 *                         description: Description of the topic this question belongs to
 *                       answeredAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/answer-explanations',
  authSupabase,
  analyticsController.getAnswerExplanations,
);

// ADMIN ROUTES
/**
 * @swagger
 * /api/analytics/admin/overview:
 *   get:
 *     summary: Get admin analytics overview with enhanced topic test data (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin analytics overview including test topic statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usersStats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     newUsersLast30Days:
 *                       type: integer
 *                     activeUsersLast7Days:
 *                       type: integer
 *                 studyStats:
 *                   type: object
 *                   properties:
 *                     totalHours:
 *                       type: number
 *                     averagePerUser:
 *                       type: number
 *                 topUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       totalStudyTime:
 *                         type: number
 *                       accuracy:
 *                         type: string
 *                 testTopicStats:
 *                   type: array
 *                   description: Test statistics by topic
 *                   items:
 *                     type: object
 *                     properties:
 *                       topicId:
 *                         type: integer
 *                       topicTitle:
 *                         type: string
 *                       totalTests:
 *                         type: integer
 *                         description: Number of tests available for this topic
 *                       testAttempts:
 *                         type: integer
 *                         description: Total test attempts for this topic
 *                       avgScore:
 *                         type: string
 *                         description: Average score across all users for this topic
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
 *     summary: Get user performance analytics with enhanced topic test data (admin/instructor only)
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
 *         description: User performance analytics including topic test breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userPerformance:
 *                   oneOf:
 *                     - type: object
 *                       description: Single user performance (when userId provided)
 *                       properties:
 *                         user_id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         total_duels:
 *                           type: integer
 *                         duels_won:
 *                           type: integer
 *                         duels_lost:
 *                           type: integer
 *                         total_study_time:
 *                           type: integer
 *                         total_sessions:
 *                           type: integer
 *                         avg_test_score:
 *                           type: number
 *                         topicBreakdown:
 *                           type: array
 *                           description: Topic breakdown including test performance
 *                           items:
 *                             type: object
 *                             properties:
 *                               topic_id:
 *                                 type: integer
 *                               topic_title:
 *                                 type: string
 *                               study_duration:
 *                                 type: integer
 *                               total_answers:
 *                                 type: integer
 *                               correct_answers:
 *                                 type: integer
 *                               tests_taken:
 *                                 type: integer
 *                               avg_test_score:
 *                                 type: string
 *                     - type: array
 *                       description: All users performance (when no userId provided)
 *                       items:
 *                         type: object
 *                         properties:
 *                           user_id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           total_duels:
 *                             type: integer
 *                           duels_won:
 *                             type: integer
 *                           duels_lost:
 *                             type: integer
 *                           total_study_time:
 *                             type: integer
 *                           total_sessions:
 *                             type: integer
 *                           avg_test_score:
 *                             type: number
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

module.exports = router;
