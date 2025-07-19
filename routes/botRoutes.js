const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Bots
 *   description: Bot management and challenges
 */

// --- SPECIFIC ROUTES FIRST (NO PARAMETERS) ---

/**
 * @swagger
 * /api/bots/available:
 *   get:
 *     summary: Get all available bots
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: The number of bots to return.
 *       - in: query
 *         name: difficulty
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *         description: Filter by difficulty level (1-5).
 *     responses:
 *       200:
 *         description: List of available bots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   botId:
 *                     type: integer
 *                   userId:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   botName:
 *                     type: string
 *                   difficultyLevel:
 *                     type: integer
 *                   accuracyRate:
 *                     type: number
 *                   avgResponseTime:
 *                     type: integer
 *                   avatar:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/available', authSupabase, botController.getAvailableBots);

/**
 * @swagger
 * /api/bots/leaderboard:
 *   get:
 *     summary: Get bot leaderboard/rankings
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: The number of bots to return.
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [difficulty, accuracy, speed], default: difficulty }
 *         description: Sort criteria for bot ranking.
 *     responses:
 *       200:
 *         description: Bot leaderboard
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/leaderboard', authSupabase, botController.getBotLeaderboard);

/**
 * @swagger
 * /api/bots/recommended:
 *   get:
 *     summary: Get recommended bot for user based on skill level
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended bot for the user
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No suitable bot found
 *       500:
 *         description: Server error
 */
router.get('/recommended', authSupabase, botController.getRecommendedBot);

/**
 * @swagger
 * /api/bots/challenge:
 *   post:
 *     summary: Challenge a bot to a duel
 *     tags: [Bots]
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
 *               - difficulty
 *             properties:
 *               testId:
 *                 type: integer
 *                 description: ID of the test to use for the duel
 *               difficulty:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Bot difficulty level (1-5)
 *     responses:
 *       201:
 *         description: Bot duel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 duel:
 *                   type: object
 *                   properties:
 *                     duel_id:
 *                       type: integer
 *                     opponent:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         botName:
 *                           type: string
 *                         isBot:
 *                           type: boolean
 *                         avatar:
 *                           type: string
 *                         difficultyLevel:
 *                           type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input - missing testId or invalid difficulty
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Test not found or no bot available for difficulty level
 *       500:
 *         description: Server error
 */
router.post('/challenge', authSupabase, botController.challengeBot);

/**
 * @swagger
 * /api/bots/difficulty/{level}:
 *   get:
 *     summary: Get bot by difficulty level
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Bot difficulty level (1-5)
 *     responses:
 *       200:
 *         description: Bot details for specified difficulty
 *       400:
 *         description: Invalid difficulty level
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No bot found for specified difficulty
 *       500:
 *         description: Server error
 */
router.get(
  '/difficulty/:level',
  authSupabase,
  botController.getBotByDifficulty,
);

// --- PARAMETERIZED ROUTES LAST ---

/**
 * @swagger
 * /api/bots/check/{userId}:
 *   get:
 *     summary: Check if a user ID belongs to a bot
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to check
 *     responses:
 *       200:
 *         description: Bot check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isBot:
 *                   type: boolean
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/check/:userId', authSupabase, botController.checkIsBot);

/**
 * @swagger
 * /api/bots/info/{userId}:
 *   get:
 *     summary: Get bot information by user ID
 *     tags: [Bots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bot user ID
 *     responses:
 *       200:
 *         description: Bot information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 botId:
 *                   type: integer
 *                 botName:
 *                   type: string
 *                 difficultyLevel:
 *                   type: integer
 *                 accuracyRate:
 *                   type: number
 *                 avgResponseTime:
 *                   type: integer
 *                 avatar:
 *                   type: string
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bot information not found
 *       500:
 *         description: Server error
 */
router.get('/info/:userId', authSupabase, botController.getBotInfo);

module.exports = router;
