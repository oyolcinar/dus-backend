const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');
const { authSupabase } = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Study Tracking
 *   description: Course-based study tracking with chronometer functionality and break time management
 */

// ===============================
// COURSE STUDY SESSION ROUTES
// ===============================

/**
 * @swagger
 * /api/study/sessions/start:
 *   post:
 *     summary: Start a new course study session with chronometer
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
 *                 description: ID of the course to study
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
 *                 session:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: integer
 *                     courseId:
 *                       type: integer
 *                     courseTitle:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     notes:
 *                       type: string
 *       400:
 *         description: Invalid input or active session exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post('/sessions/start', authSupabase, studyController.startStudySession);

/**
 * @swagger
 * /api/study/sessions/{sessionId}/end:
 *   post:
 *     summary: End a course study session
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
 *               notes:
 *                 type: string
 *                 description: Optional notes when ending the session
 *     responses:
 *       200:
 *         description: Study session ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 session:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: integer
 *                     courseId:
 *                       type: integer
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     studyDurationSeconds:
 *                       type: integer
 *                     breakDurationSeconds:
 *                       type: integer
 *                     totalDurationSeconds:
 *                       type: integer
 *                     studyDurationMinutes:
 *                       type: number
 *                     breakDurationMinutes:
 *                       type: number
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
 * /api/study/sessions/{sessionId}/break:
 *   post:
 *     summary: Add break time to active study session (mola)
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - breakDurationSeconds
 *             properties:
 *               breakDurationSeconds:
 *                 type: integer
 *                 minimum: 1
 *                 description: Break duration in seconds
 *     responses:
 *       200:
 *         description: Break time added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 breakDurationSeconds:
 *                   type: integer
 *                 breakDurationMinutes:
 *                   type: number
 *                 totalBreakSeconds:
 *                   type: integer
 *                 totalBreakMinutes:
 *                   type: number
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Active session not found
 */
router.post(
  '/sessions/:sessionId/break',
  authSupabase,
  studyController.addBreakTime,
);

/**
 * @swagger
 * /api/study/sessions/active:
 *   get:
 *     summary: Get active study session for current user
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active session data or null if no active session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeSession:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     sessionId:
 *                       type: integer
 *                     courseId:
 *                       type: integer
 *                     courseTitle:
 *                       type: string
 *                     courseDescription:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     currentDurationSeconds:
 *                       type: integer
 *                     currentStudyDurationSeconds:
 *                       type: integer
 *                     breakDurationSeconds:
 *                       type: integer
 *                     currentDurationMinutes:
 *                       type: number
 *                     currentStudyDurationMinutes:
 *                       type: number
 *                     breakDurationMinutes:
 *                       type: number
 *                     notes:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/sessions/active',
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
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *     responses:
 *       200:
 *         description: List of study sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sessionId:
 *                         type: integer
 *                       courseId:
 *                         type: integer
 *                       courseTitle:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       studyDurationSeconds:
 *                         type: integer
 *                       breakDurationSeconds:
 *                         type: integer
 *                       totalDurationSeconds:
 *                         type: integer
 *                       studyDurationMinutes:
 *                         type: number
 *                       breakDurationMinutes:
 *                         type: number
 *                       sessionDate:
 *                         type: string
 *                         format: date
 *                       sessionStatus:
 *                         type: string
 *                       notes:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authSupabase, studyController.getUserStudySessions);

// ===============================
// COURSE PROGRESS ROUTES
// ===============================

/**
 * @swagger
 * /api/study/progress:
 *   post:
 *     summary: Update user course progress
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
 *                 description: Course ID
 *               tekrarSayisi:
 *                 type: integer
 *                 description: Number of repetitions
 *               konuKaynaklari:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Course resources
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
 *               completionPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Completion percentage
 *               notes:
 *                 type: string
 *                 description: User notes
 *               isCompleted:
 *                 type: boolean
 *                 description: Whether course is completed
 *     responses:
 *       200:
 *         description: Course progress updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/progress',
  authSupabase,
  studyController.updateUserCourseProgress,
);

/**
 * @swagger
 * /api/study/progress/{courseId}:
 *   get:
 *     summary: Get user course progress
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
 *         description: Course progress data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     userId:
 *                       type: integer
 *                     tekrarSayisi:
 *                       type: integer
 *                     konuKaynaklari:
 *                       type: array
 *                       items:
 *                         type: string
 *                     soruBankasiKaynaklari:
 *                       type: array
 *                       items:
 *                         type: string
 *                     totalStudyTimeSeconds:
 *                       type: integer
 *                     totalBreakTimeSeconds:
 *                       type: integer
 *                     totalSessionCount:
 *                       type: integer
 *                     totalStudyTimeMinutes:
 *                       type: number
 *                     totalStudyTimeHours:
 *                       type: number
 *                     lastStudiedAt:
 *                       type: string
 *                       format: date-time
 *                     difficultyRating:
 *                       type: integer
 *                     completionPercentage:
 *                       type: number
 *                     isCompleted:
 *                       type: boolean
 *                     notes:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get(
  '/progress/:courseId',
  authSupabase,
  studyController.getUserCourseProgress,
);

/**
 * @swagger
 * /api/study/courses/{courseId}/complete:
 *   post:
 *     summary: Mark course as completed
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
 *         description: Course marked as completed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/courses/:courseId/complete',
  authSupabase,
  studyController.markCourseCompleted,
);

// ===============================
// COURSE & OVERVIEW ROUTES
// ===============================

/**
 * @swagger
 * /api/study/courses:
 *   get:
 *     summary: Get all available courses
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseType
 *         schema:
 *           type: string
 *           enum: [temel_dersler, klinik_dersler]
 *         description: Filter by course type
 *     responses:
 *       200:
 *         description: List of courses
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
 *                   course_type:
 *                     type: string
 *                   image_url:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/courses', authSupabase, studyController.getAllCourses);

/**
 * @swagger
 * /api/study/overview:
 *   get:
 *     summary: Get user study overview for all courses
 *     tags: [Study Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Course study overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coursesOverview:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseId:
 *                         type: integer
 *                       courseTitle:
 *                         type: string
 *                       courseDescription:
 *                         type: string
 *                       courseType:
 *                         type: string
 *                       tekrarSayisi:
 *                         type: integer
 *                       konuKaynaklari:
 *                         type: array
 *                         items:
 *                           type: string
 *                       soruBankasiKaynaklari:
 *                         type: array
 *                         items:
 *                           type: string
 *                       totalStudyTimeSeconds:
 *                         type: integer
 *                       totalBreakTimeSeconds:
 *                         type: integer
 *                       totalSessionCount:
 *                         type: integer
 *                       totalStudyTimeMinutes:
 *                         type: number
 *                       totalStudyTimeHours:
 *                         type: number
 *                       lastStudiedAt:
 *                         type: string
 *                         format: date-time
 *                       difficultyRating:
 *                         type: integer
 *                       completionPercentage:
 *                         type: number
 *                       isCompleted:
 *                         type: boolean
 *                       activeSessionId:
 *                         type: integer
 *                         nullable: true
 *                       notes:
 *                         type: string
 *                 totalCourses:
 *                   type: integer
 *                 completedCourses:
 *                   type: integer
 *                 coursesInProgress:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/overview',
  authSupabase,
  studyController.getUserAllCoursesOverview,
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSessions:
 *                   type: integer
 *                 totalStudyTimeSeconds:
 *                   type: integer
 *                 totalBreakTimeSeconds:
 *                   type: integer
 *                 totalStudyTimeHours:
 *                   type: number
 *                 totalBreakTimeHours:
 *                   type: number
 *                 longestSessionSeconds:
 *                   type: integer
 *                 longestSessionMinutes:
 *                   type: number
 *                 averageSessionSeconds:
 *                   type: integer
 *                 averageSessionMinutes:
 *                   type: number
 *                 recentStudyTimeSeconds:
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
 *                 studyTimeByCourse:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       course_id:
 *                         type: integer
 *                       course_title:
 *                         type: string
 *                       total_duration:
 *                         type: integer
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
 *                 description: Course ID
 *     responses:
 *       200:
 *         description: Preferred course set successfully
 *       400:
 *         description: Invalid course ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
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
 *                   nullable: true
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     courseType:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/preferred-course',
  authSupabase,
  studyController.getUserPreferredCourse,
);

// ===============================
// DEPRECATED ENDPOINTS (Topic-based)
// ===============================

// These endpoints return deprecation notices and redirect to course-based endpoints

/**
 * @deprecated Topic-based study sessions are deprecated. Use course-based sessions instead.
 */
router.post('/topic/:topicId/start', authSupabase, (req, res) => {
  res.status(410).json({
    message: 'Topic-based study sessions have been deprecated.',
    suggestion:
      'Use course-based study sessions instead: POST /api/study/sessions/start',
    migration:
      'The system now manages study sessions at the course level rather than topic level.',
  });
});

/**
 * @deprecated Topic-based progress tracking is deprecated. Use course-based progress instead.
 */
router.post('/topic-details', authSupabase, (req, res) => {
  res.status(410).json({
    message: 'Topic-based progress tracking has been deprecated.',
    suggestion:
      'Use course-based progress tracking instead: POST /api/study/progress',
    migration:
      'Progress tracking is now handled at the course level with aggregated topic data.',
  });
});

/**
 * @deprecated Topic-based details retrieval is deprecated. Use course-based progress instead.
 */
router.get('/topic-details/:topicId', authSupabase, (req, res) => {
  res.status(410).json({
    message: 'Topic-based details retrieval has been deprecated.',
    suggestion:
      'Use course-based progress retrieval instead: GET /api/study/progress/{courseId}',
    migration:
      'Detailed progress information is now available at the course level.',
  });
});

module.exports = router;
