const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const authMiddleware = require('../middleware/auth');
const authSupabase = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Results
 *   description: Test results management
 */

/**
 * @swagger
 * /api/results/submit:
 *   post:
 *     summary: Submit a test result with answers
 *     tags: [Results]
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
 *               - score
 *               - answers
 *             properties:
 *               testId:
 *                 type: integer
 *               score:
 *                 type: number
 *                 format: float
 *               timeTaken:
 *                 type: integer
 *                 description: Time taken in seconds
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                     - userAnswer
 *                     - isCorrect
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                     userAnswer:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Test result submitted successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test not found
 */
router.post('/submit', authSupabase, resultController.submitTest);

/**
 * @swagger
 * /api/results/user:
 *   get:
 *     summary: Get current user's test results
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's test results
 *       401:
 *         description: Unauthorized
 */
router.get('/user', authSupabase, resultController.getUserResults);

/**
 * @swagger
 * /api/results/{id}:
 *   get:
 *     summary: Get detailed test result with answers
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Result ID
 *     responses:
 *       200:
 *         description: Test result details with answers
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Result not found
 */
router.get('/:id', authSupabase, resultController.getResultDetails);

/**
 * @swagger
 * /api/results/stats/{testId}:
 *   get:
 *     summary: Get test statistics
 *     tags: [Results]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Test statistics
 *       404:
 *         description: Test not found
 */
router.get('/stats/:testId', resultController.getTestStats);

module.exports = router;
