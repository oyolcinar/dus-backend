const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authSupabase } = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

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
 *               - courseId
 *               - difficultyLevel
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the test
 *               description:
 *                 type: string
 *                 description: Description of the test
 *               courseId:
 *                 type: integer
 *                 description: ID of the course this test belongs to
 *               topicId:
 *                 type: integer
 *                 description: ID of the topic this test belongs to (optional)
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Difficulty level of the test
 *               timeLimit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 180
 *                 description: Time limit in minutes (default 30)
 *     responses:
 *       201:
 *         description: Test created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course or topic not found
 */
router.post(
  '/',
  authSupabase,
  authorizePermission('manage_tests'),
  testController.create,
);

/**
 * @swagger
 * /api/tests:
 *   get:
 *     summary: Get all tests
 *     tags: [Tests]
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Filter tests by course ID
 *       - in: query
 *         name: topicId
 *         schema:
 *           type: integer
 *         description: Filter tests by topic ID
 *       - in: query
 *         name: courseType
 *         schema:
 *           type: string
 *           enum: [temel_dersler, klinik_dersler]
 *         description: Filter tests by course type
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
 *                   course_id:
 *                     type: integer
 *                   topic_id:
 *                     type: integer
 *                   difficulty_level:
 *                     type: integer
 *                   question_count:
 *                     type: integer
 *                   time_limit:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   courses:
 *                     type: object
 *                     properties:
 *                       course_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       course_type:
 *                         type: string
 *                   topics:
 *                     type: object
 *                     properties:
 *                       topic_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/', testController.getAll);

/**
 * @swagger
 * /api/tests/course/{courseId}:
 *   get:
 *     summary: Get tests by course ID
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: List of tests for the course
 *       404:
 *         description: Course not found
 */
router.get('/course/:courseId', testController.getByCourseId);

/**
 * @swagger
 * /api/tests/topic/{topicId}:
 *   get:
 *     summary: Get tests by topic ID
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: List of tests for the topic
 *       404:
 *         description: Topic not found
 */
router.get('/topic/:topicId', testController.getByTopicId);

/**
 * @swagger
 * /api/tests/course-type/{courseType}:
 *   get:
 *     summary: Get tests by course type
 *     tags: [Tests]
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
 *         description: List of tests for the course type
 *       400:
 *         description: Invalid course type
 */
router.get('/course-type/:courseType', testController.getByCourseType);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 test_id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 course_id:
 *                   type: integer
 *                 topic_id:
 *                   type: integer
 *                 difficulty_level:
 *                   type: integer
 *                 question_count:
 *                   type: integer
 *                 time_limit:
 *                   type: integer
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 courses:
 *                   type: object
 *                 topics:
 *                   type: object
 *       404:
 *         description: Test not found
 */
router.get('/:id', testController.getById);

/**
 * @swagger
 * /api/tests/{id}/with-questions:
 *   get:
 *     summary: Get test by ID with all its questions
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
 *         description: Test details with questions
 *       404:
 *         description: Test not found
 */
router.get('/:id/with-questions', testController.getWithQuestions);

/**
 * @swagger
 * /api/tests/{id}/stats:
 *   get:
 *     summary: Get test statistics
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
 *         description: Test statistics
 *       404:
 *         description: Test not found
 */
router.get('/:id/stats', testController.getTestStats);

/**
 * @swagger
 * /api/tests/{id}/user-history:
 *   get:
 *     summary: Check if user has taken test before
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
 *         description: User test history
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test not found
 */
router.get(
  '/:id/user-history',
  authSupabase,
  testController.checkUserTestHistory,
);

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
 *                 description: Title of the test
 *               description:
 *                 type: string
 *                 description: Description of the test
 *               courseId:
 *                 type: integer
 *                 description: ID of the course this test belongs to
 *               topicId:
 *                 type: integer
 *                 description: ID of the topic this test belongs to (null to remove association)
 *               difficultyLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Difficulty level of the test
 *               timeLimit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 180
 *                 description: Time limit in minutes
 *     responses:
 *       200:
 *         description: Test updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test, course, or topic not found
 */
router.put(
  '/:id',
  authSupabase,
  authorizePermission('manage_tests'),
  testController.update,
);

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
router.delete(
  '/:id',
  authSupabase,
  authorizePermission('manage_tests'),
  testController.delete,
);

module.exports = router;
