const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authSupabase = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Test question management
 */

/**
 * @swagger
 * /api/questions:
 *   post:
 *     summary: Create a new question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testId
 *               - questionText
 *               - correctAnswer
 *             properties:
 *               testId:
 *                 type: integer
 *                 description: ID of the test this question belongs to
 *               questionText:
 *                 type: string
 *                 description: The question text
 *               options:
 *                 type: object
 *                 description: Answer options in format {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}
 *                 example:
 *                   A: "Option A text"
 *                   B: "Option B text"
 *                   C: "Option C text"
 *                   D: "Option D text"
 *               correctAnswer:
 *                 type: string
 *                 description: The correct answer key (A, B, C, D, etc.)
 *                 example: "C"
 *               explanation:
 *                 type: string
 *                 description: Explanation of why the correct answer is correct
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Question created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 question:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: integer
 *                     test_id:
 *                       type: integer
 *                     question_text:
 *                       type: string
 *                     options:
 *                       type: object
 *                       description: Answer options in format {"A": "Option A", "B": "Option B", ...}
 *                     correct_answer:
 *                       type: string
 *                     explanation:
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
 *         description: Test not found
 */
router.post(
  '/',
  authSupabase,
  authorizePermission('manage_questions'),
  questionController.create,
);

/**
 * @swagger
 * /api/questions/batch:
 *   post:
 *     summary: Create multiple questions
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questions
 *             properties:
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - testId
 *                     - questionText
 *                     - correctAnswer
 *                   properties:
 *                     testId:
 *                       type: integer
 *                       description: ID of the test this question belongs to
 *                     questionText:
 *                       type: string
 *                       description: The question text
 *                     options:
 *                       type: object
 *                       description: Answer options in format {"A": "Option A", "B": "Option B", ...}
 *                     correctAnswer:
 *                       type: string
 *                       description: The correct answer key (A, B, C, D, etc.)
 *                     explanation:
 *                       type: string
 *                       description: Explanation of why the correct answer is correct
 *                       nullable: true
 *     responses:
 *       201:
 *         description: Questions created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/batch',
  authSupabase,
  authorizePermission('manage_questions'),
  questionController.createBatch,
);

/**
 * @swagger
 * /api/questions/test/{testId}:
 *   get:
 *     summary: Get questions by test ID
 *     tags: [Questions]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Test ID
 *     responses:
 *       200:
 *         description: List of questions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   question_id:
 *                     type: integer
 *                   test_id:
 *                     type: integer
 *                   question_text:
 *                     type: string
 *                   options:
 *                     type: object
 *                     description: Answer options in format {"A": "Option A", "B": "Option B", ...}
 *                   correct_answer:
 *                     type: string
 *                   explanation:
 *                     type: string
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Test not found
 */
router.get('/test/:testId', questionController.getByTestId);

/**
 * @swagger
 * /api/questions/{id}:
 *   get:
 *     summary: Get question by ID
 *     tags: [Questions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question_id:
 *                   type: integer
 *                 test_id:
 *                   type: integer
 *                 question_text:
 *                   type: string
 *                 options:
 *                   type: object
 *                   description: Answer options in format {"A": "Option A", "B": "Option B", ...}
 *                 correct_answer:
 *                   type: string
 *                 explanation:
 *                   type: string
 *                   nullable: true
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Question not found
 */
router.get('/:id', questionController.getById);

/**
 * @swagger
 * /api/questions/{id}:
 *   put:
 *     summary: Update a question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionText:
 *                 type: string
 *                 description: The question text
 *               options:
 *                 type: object
 *                 description: Answer options in format {"A": "Option A", "B": "Option B", ...}
 *               correctAnswer:
 *                 type: string
 *                 description: The correct answer key (A, B, C, D, etc.)
 *               explanation:
 *                 type: string
 *                 description: Explanation of why the correct answer is correct
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Question updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 question:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: integer
 *                     test_id:
 *                       type: integer
 *                     question_text:
 *                       type: string
 *                     options:
 *                       type: object
 *                       description: Answer options in format {"A": "Option A", "B": "Option B", ...}
 *                     correct_answer:
 *                       type: string
 *                     explanation:
 *                       type: string
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question not found
 */
router.put(
  '/:id',
  authSupabase,
  authorizePermission('manage_questions'),
  questionController.update,
);

/**
 * @swagger
 * /api/questions/{id}/explanation:
 *   put:
 *     summary: Update question explanation only
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - explanation
 *             properties:
 *               explanation:
 *                 type: string
 *                 description: Explanation of why the correct answer is correct
 *     responses:
 *       200:
 *         description: Question explanation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 question:
 *                   type: object
 *                   properties:
 *                     question_id:
 *                       type: integer
 *                     test_id:
 *                       type: integer
 *                     question_text:
 *                       type: string
 *                     options:
 *                       type: object
 *                     correct_answer:
 *                       type: string
 *                     explanation:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question not found
 */
router.put(
  '/:id/explanation',
  authSupabase,
  authorizePermission('manage_questions'),
  questionController.updateExplanation,
);

/**
 * @swagger
 * /api/questions/{id}:
 *   delete:
 *     summary: Delete a question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question not found
 */
router.delete(
  '/:id',
  authSupabase,
  authorizePermission('manage_questions'),
  questionController.delete,
);

module.exports = router;
