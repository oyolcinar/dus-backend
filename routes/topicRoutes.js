const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Topics
 *   description: Topic management
 */

/**
 * @swagger
 * /api/topics:
 *   post:
 *     summary: Create a new topic (admin only)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - title
 *             properties:
 *               courseId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               orderIndex:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Topic created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/',
  authSupabase,
  authorizePermission('manage_topics'),
  topicController.create,
);

/**
 * @swagger
 * /api/topics/course/{courseId}:
 *   get:
 *     summary: Get topics by course ID
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: List of topics
 *       404:
 *         description: Course not found
 */
router.get('/course/:courseId', topicController.getByCourseId);

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     summary: Get topic by ID with subtopics
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic details with subtopics
 *       404:
 *         description: Topic not found
 */
router.get('/:id', topicController.getById);

/**
 * @swagger
 * /api/topics/{id}:
 *   put:
 *     summary: Update a topic (admin only)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
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
 *               orderIndex:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Topic updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Topic not found
 */
router.put(
  '/:id',
  authSupabase,
  authorizePermission('manage_topics'),
  topicController.update,
);

/**
 * @swagger
 * /api/topics/{id}:
 *   delete:
 *     summary: Delete a topic (admin only)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Topic not found
 */
router.delete(
  '/:id',
  authSupabase,
  authorizePermission('manage_topics'),
  topicController.delete,
);

module.exports = router;
