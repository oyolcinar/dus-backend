const express = require('express');
const router = express.Router();
const subtopicController = require('../controllers/subtopicController');
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Subtopics
 *   description: Subtopic management
 */

/**
 * @swagger
 * /api/subtopics:
 *   post:
 *     summary: Create a new subtopic (admin only)
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topicId
 *               - title
 *             properties:
 *               topicId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               orderIndex:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Subtopic created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Topic not found
 */
router.post(
  '/',
  authSupabase,
  authorizePermission('manage_subtopics'),
  subtopicController.create,
);

/**
 * @swagger
 * /api/subtopics/topic/{topicId}:
 *   get:
 *     summary: Get subtopics by topic ID
 *     tags: [Subtopics]
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: List of subtopics
 *       404:
 *         description: Topic not found
 */
router.get('/topic/:topicId', subtopicController.getByTopicId);

/**
 * @swagger
 * /api/subtopics/{id}:
 *   get:
 *     summary: Get subtopic by ID
 *     tags: [Subtopics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subtopic ID
 *     responses:
 *       200:
 *         description: Subtopic details
 *       404:
 *         description: Subtopic not found
 */
router.get('/:id', subtopicController.getById);

/**
 * @swagger
 * /api/subtopics/{id}:
 *   put:
 *     summary: Update a subtopic (admin only)
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subtopic ID
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
 *         description: Subtopic updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subtopic not found
 */
router.put(
  '/:id',
  authSupabase,
  authorizePermission('manage_subtopics'),
  subtopicController.update,
);

/**
 * @swagger
 * /api/subtopics/{id}:
 *   delete:
 *     summary: Delete a subtopic (admin only)
 *     tags: [Subtopics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subtopic ID
 *     responses:
 *       200:
 *         description: Subtopic deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subtopic not found
 */
router.delete(
  '/:id',
  authSupabase,
  authorizePermission('manage_subtopics'),
  subtopicController.delete,
);

module.exports = router;
