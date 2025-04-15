const express = require('express');
const router = express.Router();
const coachingController = require('../controllers/coachingController');
const authMiddleware = require('../middleware/auth');

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
 *     summary: Create a new coaching note (admin only)
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
 */
router.post('/notes', authMiddleware, coachingController.createNote);

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
 *     summary: Create a new motivational message (admin only)
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
 */
router.post('/messages', authMiddleware, coachingController.createMessage);

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
 *     summary: Create a new strategy video (admin only)
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
 */
router.post('/videos', authMiddleware, coachingController.createVideo);

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

module.exports = router;
