const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend management
 */

/**
 * @swagger
 * /api/friends/request:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendId
 *             properties:
 *               friendId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Friend request sent successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post('/request', authMiddleware, friendController.sendRequest);

/**
 * @swagger
 * /api/friends/{friendId}/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Friend ID
 *     responses:
 *       200:
 *         description: Friend request accepted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Friend request not found
 */
router.post(
  '/:friendId/accept',
  authMiddleware,
  friendController.acceptRequest,
);

/**
 * @swagger
 * /api/friends/{friendId}/reject:
 *   post:
 *     summary: Reject a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Friend ID
 *     responses:
 *       200:
 *         description: Friend request rejected successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Friend request not found
 */
router.post(
  '/:friendId/reject',
  authMiddleware,
  friendController.rejectRequest,
);

/**
 * @swagger
 * /api/friends:
 *   get:
 *     summary: Get user's friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's friends
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, friendController.getUserFriends);

/**
 * @swagger
 * /api/friends/requests:
 *   get:
 *     summary: Get pending friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending friend requests
 *       401:
 *         description: Unauthorized
 */
router.get('/requests', authMiddleware, friendController.getPendingRequests);

/**
 * @swagger
 * /api/friends/{friendId}:
 *   delete:
 *     summary: Remove a friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Friend ID
 *     responses:
 *       200:
 *         description: Friend removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Friend not found
 */
router.delete('/:friendId', authMiddleware, friendController.removeFriend);

module.exports = router;
