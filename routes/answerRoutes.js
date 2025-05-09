const express = require('express');
const router = express.Router();
const answerController = require('../controllers/answerController');
// Replace the old auth middleware with the new one
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Answers
 *   description: User answers management
 */

/**
 * @swagger
 * /api/answers:
 *   post:
 *     summary: Create a new answer
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resultId
 *               - questionId
 *               - userAnswer
 *               - isCorrect
 *             properties:
 *               resultId:
 *                 type: integer
 *               questionId:
 *                 type: integer
 *               userAnswer:
 *                 type: string
 *               isCorrect:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Answer recorded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test result or question not found
 */
router.post('/', authSupabase, answerController.create);

/**
 * @swagger
 * /api/answers/batch:
 *   post:
 *     summary: Create multiple answers
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - resultId
 *                     - questionId
 *                     - userAnswer
 *                     - isCorrect
 *                   properties:
 *                     resultId:
 *                       type: integer
 *                     questionId:
 *                       type: integer
 *                     userAnswer:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Answers recorded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/batch', authSupabase, answerController.createBatch);

/**
 * @swagger
 * /api/answers/result/{resultId}:
 *   get:
 *     summary: Get answers by result ID
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *     responses:
 *       200:
 *         description: List of answers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you don't have permission to view these answers
 *       404:
 *         description: Test result not found
 */
router.get('/result/:resultId', authSupabase, answerController.getByResultId);

module.exports = router;
