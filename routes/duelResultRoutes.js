const express = require('express');
const router = express.Router();
const duelResultController = require('../controllers/duelResultController');
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Duel Results
 *   description: Duel results management
 */

/**
 * @swagger
 * /api/duel-results:
 *   post:
 *     summary: Record duel result
 *     tags: [Duel Results]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - duelId
 *               - initiatorScore
 *               - opponentScore
 *             properties:
 *               duelId:
 *                 type: integer
 *               winnerId:
 *                 type: integer
 *               initiatorScore:
 *                 type: number
 *                 format: float
 *               opponentScore:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: Duel result recorded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you do not have permission to record this duel result
 *       404:
 *         description: Duel or winner not found
 */
router.post('/', authSupabase, duelResultController.create);

/**
 * @swagger
 * /api/duel-results/stats/user:
 *   get:
 *     summary: Get current user's duel statistics
 *     tags: [Duel Results]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user's duel statistics
 *       401:
 *         description: Unauthorized
 */
// CRITICAL: This route MUST come BEFORE the parameterized route /:duelId
router.get('/stats/user', authSupabase, duelResultController.getUserStats);

/**
 * @swagger
 * /api/duel-results/stats/user/{userId}:
 *   get:
 *     summary: Get user's duel statistics
 *     tags: [Duel Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: false
 *         schema:
 *           type: integer
 *         description: User ID (defaults to authenticated user)
 *     responses:
 *       200:
 *         description: User's duel statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you do not have permission to view this user's statistics
 *       404:
 *         description: User not found
 */
// CRITICAL: This route MUST also come BEFORE the parameterized route /:duelId
router.get(
  '/stats/user/:userId',
  authSupabase,
  duelResultController.getUserStats,
);

/**
 * @swagger
 * /api/duel-results/{duelId}:
 *   get:
 *     summary: Get result by duel ID
 *     tags: [Duel Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: duelId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duel ID
 *     responses:
 *       200:
 *         description: Duel result
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you do not have permission to view this duel result
 *       404:
 *         description: Duel or result not found
 */
// CRITICAL: This parameterized route MUST come LAST to avoid conflicts
router.get('/:duelId', authSupabase, duelResultController.getByDuelId);

module.exports = router;
