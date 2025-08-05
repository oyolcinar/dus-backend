const express = require('express');
const router = express.Router();
const coachingController = require('../controllers/coachingController');
// Replace the old auth middleware with the new ones
const { authSupabase } = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Coaching
 *   description: Coaching and motivational content
 */

/**
 * @swagger
 * /api/coaching/notes:
 *   post:
 *     summary: Create a new coaching note (admin/instructor only)
 *     tags: [Coaching]
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
 *               - content
 *               - publishDate
 *               - weekNumber
 *               - year
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               publishDate:
 *                 type: string
 *                 format: date
 *               weekNumber:
 *                 type: integer
 *               year:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Coaching note created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post(
  '/notes',
  authSupabase,
  authorizePermission('manage_coaching'),
  coachingController.createNote,
);

/**
 * @swagger
 * /api/coaching/notes:
 *   get:
 *     summary: Get all coaching notes
 *     tags: [Coaching]
 *     responses:
 *       200:
 *         description: List of coaching notes
 */
router.get('/notes', coachingController.getAllNotes);

/**
 * @swagger
 * /api/coaching/notes/latest:
 *   get:
 *     summary: Get latest coaching note
 *     tags: [Coaching]
 *     responses:
 *       200:
 *         description: Latest coaching note
 *       404:
 *         description: No coaching notes found
 */
router.get('/notes/latest', coachingController.getLatestNote);

/**
 * @swagger
 * /api/coaching/messages:
 *   post:
 *     summary: Create a new motivational message (admin/instructor only)
 *     tags: [Coaching]
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
 *               - audioUrl
 *               - publishDate
 *             properties:
 *               title:
 *                 type: string
 *               audioUrl:
 *                 type: string
 *               description:
 *                 type: string
 *               publishDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Motivational message created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post(
  '/messages',
  authSupabase,
  authorizePermission('manage_motivation'),
  coachingController.createMessage,
);

/**
 * @swagger
 * /api/coaching/messages:
 *   get:
 *     summary: Get all motivational messages
 *     tags: [Coaching]
 *     responses:
 *       200:
 *         description: List of motivational messages
 */
router.get('/messages', coachingController.getAllMessages);

/**
 * @swagger
 * /api/coaching/videos:
 *   post:
 *     summary: Create a new strategy video (admin/instructor only)
 *     tags: [Coaching]
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
 *               - externalUrl
 *             properties:
 *               title:
 *                 type: string
 *               externalUrl:
 *                 type: string
 *               description:
 *                 type: string
 *               isPremium:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Strategy video created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post(
  '/videos',
  authSupabase,
  authorizePermission('manage_strategy'),
  coachingController.createVideo,
);

/**
 * @swagger
 * /api/coaching/videos:
 *   get:
 *     summary: Get all strategy videos
 *     tags: [Coaching]
 *     parameters:
 *       - in: query
 *         name: premium
 *         schema:
 *           type: boolean
 *         description: Filter by premium status
 *     responses:
 *       200:
 *         description: List of strategy videos
 */
router.get('/videos', coachingController.getAllVideos);

/**
 * @swagger
 * /api/coaching/notes/{id}:
 *   put:
 *     summary: Update a coaching note (admin/instructor only)
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Coaching note ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               publishDate:
 *                 type: string
 *                 format: date
 *               weekNumber:
 *                 type: integer
 *               year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Coaching note updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Coaching note not found
 */
router.put(
  '/notes/:id',
  authSupabase,
  authorizePermission('manage_coaching'),
  coachingController.updateNote,
);

/**
 * @swagger
 * /api/coaching/messages/{id}:
 *   put:
 *     summary: Update a motivational message (admin/instructor only)
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               audioUrl:
 *                 type: string
 *               description:
 *                 type: string
 *               publishDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Motivational message updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Message not found
 */
router.put(
  '/messages/:id',
  authSupabase,
  authorizePermission('manage_motivation'),
  coachingController.updateMessage,
);

/**
 * @swagger
 * /api/coaching/videos/{id}:
 *   put:
 *     summary: Update a strategy video (admin/instructor only)
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               externalUrl:
 *                 type: string
 *               description:
 *                 type: string
 *               isPremium:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Strategy video updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Video not found
 */
router.put(
  '/videos/:id',
  authSupabase,
  authorizePermission('manage_strategy'),
  coachingController.updateVideo,
);

/**
 * @swagger
 * /api/coaching/notes/{id}:
 *   delete:
 *     summary: Delete a coaching note (admin/instructor only)
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Coaching note ID
 *     responses:
 *       200:
 *         description: Coaching note deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Coaching note not found
 */
router.delete(
  '/notes/:id',
  authSupabase,
  authorizePermission('manage_coaching'),
  coachingController.deleteNote,
);

/**
 * @swagger
 * /api/coaching/messages/{id}:
 *   delete:
 *     summary: Delete a motivational message (admin/instructor only)
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Motivational message deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Motivational message not found
 */
router.delete(
  '/messages/:id',
  authSupabase,
  authorizePermission('manage_motivation'),
  coachingController.deleteMessage,
);

/**
 * @swagger
 * /api/coaching/videos/{id}:
 *   delete:
 *     summary: Delete a strategy video (admin/instructor only)
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Strategy video deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Strategy video not found
 */
router.delete(
  '/videos/:id',
  authSupabase,
  authorizePermission('manage_strategy'),
  coachingController.deleteVideo,
);

module.exports = router;
