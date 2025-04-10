const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Tests
 *   description: Test management
 */

/**
 * @swagger
 * /api/tests:
 *   post:
 *     summary: Create a new test
 *     tags: [Tests]
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
 *               - difficultyLevel
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Test created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, testController.create);

/**
 * @swagger
 * /api/tests:
 *   get:
 *     summary: Get all tests
 *     tags: [Tests]
 *     responses:
 *       200:
 *         description: List of tests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   test_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   difficulty_level:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 */
router.get('/', testController.getAll);

/**
 * @swagger
 * /api/tests/{id}:
 *   get:
 *     summary: Get test by ID
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Test details
 *       404:
 *         description: Test not found
 */
router.get('/:id', testController.getById);

/**
 * @swagger
 * /api/tests/{id}:
 *   put:
 *     summary: Update a test
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Test ID
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
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Test updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test not found
 */
router.put('/:id', authMiddleware, testController.update);

/**
 * @swagger
 * /api/tests/{id}:
 *   delete:
 *     summary: Delete a test
 *     tags: [Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Test ID
 *     responses:
 *       200:
 *         description: Test deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test not found
 */
router.delete('/:id', authMiddleware, testController.delete);

module.exports = router;
