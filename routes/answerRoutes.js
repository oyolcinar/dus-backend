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
 *                 description: ID of the test result
 *               questionId:
 *                 type: integer
 *                 description: ID of the question being answered
 *               userAnswer:
 *                 type: string
 *                 description: The user's answer to the question
 *               isCorrect:
 *                 type: boolean
 *                 description: Whether the answer is correct
 *               answerDefinition:
 *                 type: string
 *                 description: Optional explanation of why the correct answer is correct
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Answer recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 answer:
 *                   type: object
 *                   properties:
 *                     answer_id:
 *                       type: integer
 *                     result_id:
 *                       type: integer
 *                     question_id:
 *                       type: integer
 *                     user_answer:
 *                       type: string
 *                     is_correct:
 *                       type: boolean
 *                     answer_definition:
 *                       type: string
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
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
 *                       description: ID of the test result
 *                     questionId:
 *                       type: integer
 *                       description: ID of the question being answered
 *                     userAnswer:
 *                       type: string
 *                       description: The user's answer to the question
 *                     isCorrect:
 *                       type: boolean
 *                       description: Whether the answer is correct
 *                     answerDefinition:
 *                       type: string
 *                       description: Optional explanation of why the correct answer is correct
 *                       nullable: true
 *     responses:
 *       201:
 *         description: Answers recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 answers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       answer_id:
 *                         type: integer
 *                       result_id:
 *                         type: integer
 *                       question_id:
 *                         type: integer
 *                       user_answer:
 *                         type: string
 *                       is_correct:
 *                         type: boolean
 *                       answer_definition:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
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
 *         description: List of answers with their explanations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   answer_id:
 *                     type: integer
 *                   result_id:
 *                     type: integer
 *                   question_id:
 *                     type: integer
 *                   user_answer:
 *                     type: string
 *                   is_correct:
 *                     type: boolean
 *                   answer_definition:
 *                     type: string
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   question_text:
 *                     type: string
 *                   options:
 *                     type: object
 *                   correct_answer:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you don't have permission to view these answers
 *       404:
 *         description: Test result not found
 */
router.get('/result/:resultId', authSupabase, answerController.getByResultId);

/**
 * @swagger
 * /api/answers/incorrect-with-explanations:
 *   get:
 *     summary: Get user's incorrect answers that have explanations
 *     tags: [Answers]
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
 *         description: List of incorrect answers with explanations
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
 *                       answer_id:
 *                         type: integer
 *                       user_answer:
 *                         type: string
 *                       correct_answer:
 *                         type: string
 *                       explanation:
 *                         type: string
 *                       question_text:
 *                         type: string
 *                       question_options:
 *                         type: object
 *                       test_title:
 *                         type: string
 *                       course_title:
 *                         type: string
 *                       answered_at:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/incorrect-with-explanations',
  authSupabase,
  answerController.getIncorrectAnswersWithExplanations,
);

/**
 * @swagger
 * /api/answers/{answerId}/definition:
 *   put:
 *     summary: Update answer definition (admin/instructor only)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: answerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Answer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answerDefinition
 *             properties:
 *               answerDefinition:
 *                 type: string
 *                 description: Explanation of why the correct answer is correct
 *     responses:
 *       200:
 *         description: Answer definition updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 answer:
 *                   type: object
 *                   properties:
 *                     answer_id:
 *                       type: integer
 *                     result_id:
 *                       type: integer
 *                     question_id:
 *                       type: integer
 *                     user_answer:
 *                       type: string
 *                     is_correct:
 *                       type: boolean
 *                     answer_definition:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only admins and instructors can update answer definitions
 */
router.put(
  '/:answerId/definition',
  authSupabase,
  answerController.updateAnswerDefinition,
);

/**
 * @swagger
 * /api/answers/explanation-stats:
 *   get:
 *     summary: Get statistics about answer explanations for the current user
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Answer explanation statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAnswers:
 *                   type: integer
 *                   description: Total number of answers by the user
 *                 totalWithExplanations:
 *                   type: integer
 *                   description: Number of answers that have explanations
 *                 correctAnswersWithExplanations:
 *                   type: integer
 *                   description: Number of correct answers with explanations
 *                 incorrectAnswersWithExplanations:
 *                   type: integer
 *                   description: Number of incorrect answers with explanations
 *                 explanationCoveragePercentage:
 *                   type: number
 *                   description: Percentage of answers that have explanations
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/explanation-stats',
  authSupabase,
  answerController.getAnswerExplanationStats,
);

module.exports = router;
