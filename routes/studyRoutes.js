const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Study
 *   description: Study progress and session management
 */

/**
 * @swagger
 * /api/study/progress:
 *   post:
 *     summary: Update study progress
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtopicId
 *               - repetitionCount
 *               - masteryLevel
 *             properties:
 *               subtopicId:
 *                 type: integer
 *               repetitionCount:
 *                 type: integer
 *               masteryLevel:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subtopic not found
 */
router.post('/progress', authMiddleware, studyController.updateProgress);

/**
 * @swagger
 * /api/study/progress:
 *   get:
 *     summary: Get user's study progress
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's study progress
 *       401:
 *         description: Unauthorized
 */
router.get('/progress', authMiddleware, studyController.getUserProgress);

/**
 * @swagger
 * /api/study/sessions/start:
 *   post:
 *     summary: Start a study session
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Study session started
 *       401:
 *         description: Unauthorized
 */
router.post('/sessions/start', authMiddleware, studyController.startSession);

/**
 * @swagger
 * /api/study/sessions/{id}/end:
 *   post:
 *     summary: End a study session
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Study session ended
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.post('/sessions/:id/end', authMiddleware, studyController.endSession);

/**
 * @swagger
 * /api/study/sessions/{id}/details:
 *   post:
 *     summary: Add detail to a study session
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtopicId
 *               - duration
 *             properties:
 *               subtopicId:
 *                 type: integer
 *               duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Session detail added
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/sessions/:id/details',
  authMiddleware,
  studyController.addSessionDetail,
);

/**
 * @swagger
 * /api/study/sessions:
 *   get:
 *     summary: Get user's study sessions
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's study sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authMiddleware, studyController.getUserSessions);

/**
 * @swagger
 * /api/study/sessions/{id}:
 *   get:
 *     summary: Get study session details
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session details
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions/:id', authMiddleware, studyController.getSessionDetails);

/**
 * @swagger
 * /api/study/stats:
 *   get:
 *     summary: Get study statistics
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Study statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authMiddleware, studyController.getStudyStats);

/**
 * @swagger
 * /api/study/analytics/errors:
 *   post:
 *     summary: Update error analytics
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtopicId
 *               - isError
 *             properties:
 *               subtopicId:
 *                 type: integer
 *               isError:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Error analytics updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/analytics/errors',
  authMiddleware,
  studyController.updateErrorAnalytics,
);

/**
 * @swagger
 * /api/study/analytics/errors:
 *   get:
 *     summary: Get user's error analytics
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's error analytics
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/analytics/errors',
  authMiddleware,
  studyController.getUserErrorAnalytics,
);

module.exports = router;
