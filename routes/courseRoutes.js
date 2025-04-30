const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
// Replace the old auth middleware with the new ones
const authSupabase = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management
 */

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course (admin only)
 *     tags: [Courses]
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post(
  '/',
  authSupabase,
  authorizePermission('manage_courses'),
  courseController.create,
);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of courses
 */
router.get('/', courseController.getAll);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID with topics and subtopics
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course details with topics and subtopics
 *       404:
 *         description: Course not found
 */
router.get('/:id', courseController.getById);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
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
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Course not found
 */
router.put(
  '/:id',
  authSupabase,
  authorizePermission('manage_courses'),
  courseController.update,
);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete a course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Course not found
 */
router.delete(
  '/:id',
  authSupabase,
  authorizePermission('manage_courses'),
  courseController.delete,
);

module.exports = router;
