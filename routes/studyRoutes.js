const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');
// Replace the old auth middleware with the new one
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Study
 *   description: Study session management
 */

/**
 * @swagger
 * /api/study/sessions/start:
 *   post:
 *     summary: Start a new study session
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Study session started successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/sessions/start', 
  authSupabase, 
  studyController.startSession
);

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
 *         description: Study session ended successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you can only end your own sessions
 *       404:
 *         description: Session not found
 */
router.post('/sessions/:id/end', 
  authSupabase, 
  studyController.endSession
);

/**
 * @swagger
 * /api/study/sessions/{id}/add-subtopic:
 *   post:
 *     summary: Add a subtopic to a study session
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
 *                 description: Duration in minutes
 *     responses:
 *       201:
 *         description: Subtopic added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you can only modify your own sessions
 *       404:
 *         description: Session or subtopic not found
 */
router.post('/sessions/:id/add-subtopic', 
  authSupabase, 
  studyController.addSubtopicToSession
);

/**
 * @swagger
 * /api/study/sessions:
 *   get:
 *     summary: Get user's study sessions
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of study sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', 
  authSupabase, 
  studyController.getUserSessions
);

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
 *         description: Study session details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you can only view your own sessions unless admin
 *       404:
 *         description: Session not found
 */
router.get('/sessions/:id', 
  authSupabase, 
  studyController.getSessionById
);

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
router.get('/progress', 
  authSupabase, 
  studyController.getUserProgress
);

/**
 * @swagger
 * /api/study/progress/subtopic/{subtopicId}:
 *   get:
 *     summary: Get user's progress for a specific subtopic
 *     tags: [Study]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subtopic ID
 *     responses:
 *       200:
 *         description: User's progress for the subtopic
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subtopic not found
 */
router.get('/progress/subtopic/:subtopicId', 
  authSupabase, 
  studyController.getSubtopicProgress
);

/**
 * @swagger
 * /api/study/progress/update:
 *   post:
 *     summary: Update study progress for a subtopic
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
 *             properties:
 *               subtopicId:
 *                 type: integer
 *               repetitionCount:
 *                 type: integer
 *               masteryLevel:
 *                 type: integer
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
router.post('/progress/update', 
  authSupabase, 
  studyController.updateProgress
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
router.get('/analytics/errors', 
  authSupabase, 
  studyController.getErrorAnalytics
);

/**
 * @swagger
 * /api/study/analytics/errors/update:
 *   post:
 *     summary: Update error analytics for a subtopic
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
 *               - errorCount
 *               - totalAttempts
 *             properties:
 *               subtopicId:
 *                 type: integer
 *               errorCount:
 *                 type: integer
 *               totalAttempts:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Error analytics updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subtopic not found
 */
router.post('/analytics/errors/update', 
  authSupabase, 
  studyController.updateErrorAnalytics
);

module.exports = router;