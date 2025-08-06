const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
// Replace the old auth middleware with the new ones
const { authSupabase } = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management with integrated study functionality
 */

// ===============================
// COURSE CRUD OPERATIONS
// ===============================

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               courseType:
 *                 type: string
 *                 enum: [temel_dersler, klinik_dersler]
 *                 default: temel_dersler
 *               nicknames:
 *                 type: string
 *                 description: Alternative names or nicknames for the course
 *     responses:
 *       201:
 *         description: Course created successfully
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
  authorizePermission('manage_courses'),
  courseController.create,
);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: subscriptionType
 *         schema:
 *           type: string
 *           enum: [free, premium]
 *         description: Filter courses by subscription type
 *       - in: query
 *         name: courseType
 *         schema:
 *           type: string
 *           enum: [temel_dersler, klinik_dersler]
 *         description: Filter courses by course type
 *       - in: query
 *         name: withProgress
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include user progress data (requires authentication)
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
 *                   image_url:
 *                     type: string
 *                   course_type:
 *                     type: string
 *                   nicknames:
 *                     type: string
 */
router.get('/', courseController.getAll);

/**
 * @swagger
 * /api/courses/type/{courseType}:
 *   get:
 *     summary: Get courses by type
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [temel_dersler, klinik_dersler]
 *         description: Course type
 *     responses:
 *       200:
 *         description: List of courses by type
 *       400:
 *         description: Invalid course type
 */
router.get('/type/:courseType', courseController.getByType);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID with topics and subtopics
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details with topics and subtopics
 *       404:
 *         description: Course not found
 */
router.get('/:id', courseController.getById);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               courseType:
 *                 type: string
 *                 enum: [temel_dersler, klinik_dersler]
 *               nicknames:
 *                 type: string
 *                 description: Alternative names or nicknames for the course
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Course not found
 */
router.put(
  '/:id',
  authSupabase,
  authorizePermission('manage_courses'),
  courseController.update,
);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete a course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       400:
 *         description: Cannot delete course with existing content
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Course not found
 */
router.delete(
  '/:id',
  authSupabase,
  authorizePermission('manage_courses'),
  courseController.delete,
);

// ===============================
// COURSE STUDY SESSION ROUTES
// ===============================

/**
 * @swagger
 * /api/courses/{id}/start-studying:
 *   post:
 *     summary: Start studying a course (creates a study session)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional notes for the study session
 *     responses:
 *       201:
 *         description: Course study session started successfully
 *       400:
 *         description: Active session already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/:id/start-studying',
  authSupabase,
  courseController.startStudying,
);

/**
 * @swagger
 * /api/courses/{id}/sessions:
 *   get:
 *     summary: Get user's study sessions for a specific course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of sessions to return
 *     responses:
 *       200:
 *         description: List of study sessions for the course
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     courseType:
 *                       type: string
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sessionId:
 *                         type: integer
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
 *                 totalSessions:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get(
  '/:id/sessions',
  authSupabase,
  courseController.getCourseStudySessions,
);

// ===============================
// COURSE PROGRESS ROUTES
// ===============================

/**
 * @swagger
 * /api/courses/{id}/progress:
 *   get:
 *     summary: Get user's progress for a specific course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: User's course progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     courseType:
 *                       type: string
 *                 progress:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     userId:
 *                       type: integer
 *                     studyTimeSeconds:
 *                       type: integer
 *                     breakTimeSeconds:
 *                       type: integer
 *                     sessionCount:
 *                       type: integer
 *                     completionPercentage:
 *                       type: number
 *                     isCompleted:
 *                       type: boolean
 *                     difficultyRating:
 *                       type: integer
 *                     tekrarSayisi:
 *                       type: integer
 *                     lastStudiedAt:
 *                       type: string
 *                       format: date-time
 *                     konuKaynaklari:
 *                       type: array
 *                       items:
 *                         type: string
 *                     soruBankasiKaynaklari:
 *                       type: array
 *                       items:
 *                         type: string
 *                     notes:
 *                       type: string
 *                     activeSessionId:
 *                       type: integer
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get('/:id/progress', authSupabase, courseController.getUserProgress);

/**
 * @swagger
 * /api/courses/{id}/progress:
 *   put:
 *     summary: Update course progress
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.put(
  '/:id/progress',
  authSupabase,
  courseController.updateCourseProgress,
);

/**
 * @swagger
 * /api/courses/{id}/complete:
 *   post:
 *     summary: Mark course as completed
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course marked as completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 course:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                     completionPercentage:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/:id/complete',
  authSupabase,
  courseController.markCourseCompleted,
);

// ===============================
// COURSE ANALYTICS & STATISTICS
// ===============================

/**
 * @swagger
 * /api/courses/{id}/stats:
 *   get:
 *     summary: Get course statistics
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     courseType:
 *                       type: string
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     courseTitle:
 *                       type: string
 *                     courseType:
 *                       type: string
 *                     totalUsers:
 *                       type: integer
 *                     totalCompletedUsers:
 *                       type: integer
 *                     totalStudyTimeSeconds:
 *                       type: integer
 *                     totalSessions:
 *                       type: integer
 *                     totalTests:
 *                       type: integer
 *                     totalQuestions:
 *                       type: integer
 *                     averageStudyTimePerUser:
 *                       type: number
 *                     completionRate:
 *                       type: number
 *       404:
 *         description: Course not found
 */
router.get('/:id/stats', courseController.getCourseStats);

/**
 * @swagger
 * /api/courses/trending:
 *   get:
 *     summary: Get trending courses (most studied recently)
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of courses to return
 *     responses:
 *       200:
 *         description: List of trending courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trendingCourses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseId:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       courseType:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       sessionCount:
 *                         type: integer
 *                       trending:
 *                         type: boolean
 */
router.get('/trending', courseController.getTrendingCourses);

// ===============================
// USER COURSE OVERVIEW
// ===============================

/**
 * @swagger
 * /api/courses/user/overview:
 *   get:
 *     summary: Get user's course overview (all courses with progress)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's course overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalCourses:
 *                       type: integer
 *                     studiedCourses:
 *                       type: integer
 *                     completedCourses:
 *                       type: integer
 *                     totalStudyTimeHours:
 *                       type: number
 *                     totalSessions:
 *                       type: integer
 *                     averageCompletionPercentage:
 *                       type: number
 *                 courses:
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
 *                       studyTimeSeconds:
 *                         type: integer
 *                       breakTimeSeconds:
 *                         type: integer
 *                       sessionCount:
 *                         type: integer
 *                       completionPercentage:
 *                         type: number
 *                       isCompleted:
 *                         type: boolean
 *                       difficultyRating:
 *                         type: integer
 *                       tekrarSayisi:
 *                         type: integer
 *                       lastStudiedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user/overview',
  authSupabase,
  courseController.getUserCourseOverview,
);

// ===============================
// PREFERRED COURSE ROUTES
// ===============================

/**
 * @swagger
 * /api/courses/{id}/set-preferred:
 *   post:
 *     summary: Set course as user's preferred course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Preferred course set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 preferredCourse:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     courseType:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/:id/set-preferred',
  authSupabase,
  courseController.setPreferredCourse,
);

/**
 * @swagger
 * /api/courses/user/preferred:
 *   get:
 *     summary: Get user's preferred course
 *     tags: [Courses]
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
  '/user/preferred',
  authSupabase,
  courseController.getPreferredCourse,
);

// ===============================
// DEPRECATED ENDPOINTS
// ===============================

/**
 * @deprecated Use course-based progress tracking instead
 * @swagger
 * /api/courses/subtopic/complete:
 *   post:
 *     summary: Mark a subtopic as completed (DEPRECATED)
 *     tags: [Courses]
 *     deprecated: true
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       410:
 *         description: This endpoint is deprecated
 */
router.post(
  '/subtopic/complete',
  authSupabase,
  courseController.markSubtopicCompleted,
);

module.exports = router;
