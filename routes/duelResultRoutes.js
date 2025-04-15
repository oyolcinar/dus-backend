const express = require('express');
const router = express.Router();
const duelResultController = require('../controllers/duelResultController');
const authMiddleware = require('../middleware/auth');

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
 *       404:
 *         description: Duel or winner not found
 */
router.post('/', authMiddleware, duelResultController.create);

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
 *       404:
 *         description: Duel or result not found
 */
router.get('/:duelId', authMiddleware, duelResultController.getByDuelId);

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
 *       404:
 *         description: User not found
 */
router.get(
  '/stats/user/:userId',
  authMiddleware,
  duelResultController.getUserStats,
);
router.get('/stats/user', authMiddleware, duelResultController.getUserStats);

module.exports = router;
