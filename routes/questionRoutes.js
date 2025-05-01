const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');

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
 *               questionText:
 *                 type: string
 *               options:
 *                 type: object
 *               correctAnswer:
 *                 type: string
 *     responses:
 *       201:
 *         description: Question created successfully
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
 *               options:
 *                 type: object
 *               correctAnswer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Question updated successfully
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
