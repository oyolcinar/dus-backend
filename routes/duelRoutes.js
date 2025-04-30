const express = require('express');
const router = express.Router();
const duelController = require('../controllers/duelController');
// Replace the old auth middleware with the new one
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Duels
 *   description: Duel management
 */

/**
 * @swagger
 * /api/duels/challenge:
 *   post:
 *     summary: Challenge a user to a duel
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - opponentId
 *               - testId
 *             properties:
 *               opponentId:
 *                 type: integer
 *               testId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Duel challenge sent successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Opponent or test not found
 */
router.post('/challenge', authSupabase, duelController.challenge);

/**
 * @swagger
 * /api/duels/pending:
 *   get:
 *     summary: Get pending duel challenges
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending duel challenges
 *       401:
 *         description: Unauthorized
 */
router.get('/pending', authSupabase, duelController.getPendingChallenges);

/**
 * @swagger
 * /api/duels/active:
 *   get:
 *     summary: Get active duels
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active duels
 *       401:
 *         description: Unauthorized
 */
router.get('/active', authSupabase, duelController.getActiveDuels);

/**
 * @swagger
 * /api/duels/completed:
 *   get:
 *     summary: Get completed duels
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of completed duels
 *       401:
 *         description: Unauthorized
 */
router.get('/completed', authSupabase, duelController.getCompletedDuels);

/**
 * @swagger
 * /api/duels/{id}:
 *   get:
 *     summary: Get duel details
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duel ID
 *     responses:
 *       200:
 *         description: Duel details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you don't have permission to view this duel
 *       404:
 *         description: Duel not found
 */
router.get('/:id', authSupabase, duelController.getDuelDetails);

/**
 * @swagger
 * /api/duels/{id}/accept:
 *   post:
 *     summary: Accept a duel challenge
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duel ID
 *     responses:
 *       200:
 *         description: Duel accepted successfully
 *       400:
 *         description: Duel cannot be accepted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the challenged user can accept
 *       404:
 *         description: Duel not found
 */
router.post('/:id/accept', authSupabase, duelController.acceptChallenge);

/**
 * @swagger
 * /api/duels/{id}/decline:
 *   post:
 *     summary: Decline a duel challenge
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duel ID
 *     responses:
 *       200:
 *         description: Duel declined successfully
 *       400:
 *         description: Duel cannot be declined
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the challenged user can decline
 *       404:
 *         description: Duel not found
 */
router.post('/:id/decline', authSupabase, duelController.declineChallenge);

/**
 * @swagger
 * /api/duels/{id}/result:
 *   post:
 *     summary: Submit duel result
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - initiatorScore
 *               - opponentScore
 *             properties:
 *               initiatorScore:
 *                 type: number
 *                 format: float
 *               opponentScore:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Duel result submitted successfully
 *       400:
 *         description: Invalid input or duel not active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only participants can submit results
 *       404:
 *         description: Duel not found
 */
router.post('/:id/result', authSupabase, duelController.submitResult);

/**
 * @swagger
 * /api/duels/stats/user:
 *   get:
 *     summary: Get user's duel statistics
 *     tags: [Duels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's duel statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/stats/user', authSupabase, duelController.getUserStats);

module.exports = router;
