const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');
const { authSupabase } = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Study Tracking
 *   description: Enhanced study tracking with chronometer functionality and topic-level details
 */

// ===============================
// CHRONOMETER ROUTES
// ===============================

/**
 * @swagger
 * /api/study/sessions/start:
 *   post:
 *     summary: Start a new study session with chronometer
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topicId
 *             properties:
 *               topicId:
 *                 type: integer
 *                 description: ID of the topic to study
 *               notes:
 *                 type: string
 *                 description: Optional notes for the study session
 *     responses:
 *       201:
 *         description: Study session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 sessionId:
 *                   type: integer
 *                 topic:
 *                   type: object
 *                   properties:
 *                     topicId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     course:
 *                       type: string
 *       400:
 *         description: Invalid input or active session exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Topic not found or not from klinik_dersler course
 */
router.post('/sessions/start', authSupabase, studyController.startStudySession);

/**
 * @swagger
 * /api/study/sessions/{sessionId}/end:
 *   post:
 *     summary: End a study session
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Study session ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endNotes:
 *                 type: string
 *                 description: Optional notes when ending the session
 *     responses:
 *       200:
 *         description: Study session ended successfully
 *       400:
 *         description: Invalid session ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found or already ended
 */
router.post(
  '/sessions/:sessionId/end',
  authSupabase,
  studyController.endStudySession,
);

/**
 * @swagger
 * /api/study/sessions/active/{topicId}:
 *   get:
 *     summary: Get active study session for a topic
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Active session data or null if no active session
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/sessions/active/:topicId',
  authSupabase,
  studyController.getActiveStudySession,
);

/**
 * @swagger
 * /api/study/sessions:
 *   get:
 *     summary: Get user's study sessions with pagination and filtering
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: topicId
 *         schema:
 *           type: integer
 *         description: Filter by topic ID
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *     responses:
 *       200:
 *         description: List of study sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authSupabase, studyController.getUserStudySessions);

// ===============================
// TOPIC DETAILS ROUTES
// ===============================

/**
 * @swagger
 * /api/study/topic-details:
 *   post:
 *     summary: Update user-specific topic details
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topicId
 *             properties:
 *               topicId:
 *                 type: integer
 *                 description: Topic ID
 *               tekrarSayisi:
 *                 type: integer
 *                 description: Number of repetitions
 *               konuKaynaklari:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Topic resources
 *               soruBankasiKaynaklari:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Question bank resources
 *               difficultyRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Difficulty rating (1-5)
 *               notes:
 *                 type: string
 *                 description: User notes
 *               isCompleted:
 *                 type: boolean
 *                 description: Whether topic is completed
 *     responses:
 *       200:
 *         description: Topic details updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Topic not found
 */
router.post(
  '/topic-details',
  authSupabase,
  studyController.updateUserTopicDetails,
);

/**
 * @swagger
 * /api/study/topic-details/{topicId}:
 *   get:
 *     summary: Get user-specific topic details
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Topic not found
 */
router.get(
  '/topic-details/:topicId',
  authSupabase,
  studyController.getUserTopicDetails,
);

// ===============================
// COURSE & OVERVIEW ROUTES
// ===============================

/**
 * @swagger
 * /api/study/courses/klinik:
 *   get:
 *     summary: Get all available klinik_dersler courses
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of klinik courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   course_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   topic_count:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/courses/klinik', authSupabase, studyController.getKlinikCourses);

/**
 * @swagger
 * /api/study/overview/course/{courseId}:
 *   get:
 *     summary: Get user study overview for a specific course
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course study overview
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/overview/course/:courseId',
  authSupabase,
  studyController.getUserCourseStudyOverview,
);

/**
 * @swagger
 * /api/study/overview/all-courses:
 *   get:
 *     summary: Get user statistics across all klinik_dersler courses
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics for all courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   course_id:
 *                     type: integer
 *                   course_title:
 *                     type: string
 *                   total_topics:
 *                     type: integer
 *                   studied_topics:
 *                     type: integer
 *                   completion_percentage:
 *                     type: number
 *                   total_study_hours:
 *                     type: number
 *                   is_preferred:
 *                     type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/overview/all-courses',
  authSupabase,
  studyController.getUserAllCoursesStatistics,
);

/**
 * @swagger
 * /api/study/statistics:
 *   get:
 *     summary: Get overall user study statistics
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overall study statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics', authSupabase, studyController.getUserStudyStatistics);

// ===============================
// PREFERRED COURSE ROUTES
// ===============================

/**
 * @swagger
 * /api/study/preferred-course:
 *   post:
 *     summary: Set user's preferred course
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: integer
 *                 description: Course ID (must be klinik_dersler course)
 *     responses:
 *       200:
 *         description: Preferred course set successfully
 *       400:
 *         description: Invalid course ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found or not klinik_dersler
 */
router.post(
  '/preferred-course',
  authSupabase,
  studyController.setUserPreferredCourse,
);

/**
 * @swagger
 * /api/study/preferred-course:
 *   get:
 *     summary: Get user's preferred course
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's preferred course
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferredCourse:
 *                   type: object
 *                   properties:
 *                     course_id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/preferred-course',
  authSupabase,
  studyController.getUserPreferredCourse,
);

module.exports = router;
