const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/auth');
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management
 */

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionType
 *               - startDate
 *               - endDate
 *             properties:
 *               subscriptionType:
 *                 type: string
 *                 enum: [free, premium, vip]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               paymentReference:
 *                 type: string
 *               amount:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, subscriptionController.create);

/**
 * @swagger
 * /api/subscriptions/active:
 *   get:
 *     summary: Get user's active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's active subscription
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/active',
  authMiddleware,
  subscriptionController.getActiveSubscription,
);

/**
 * @swagger
 * /api/subscriptions/history:
 *   get:
 *     summary: Get user's subscription history
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's subscription history
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/history',
  authMiddleware,
  subscriptionController.getUserSubscriptions,
);

/**
 * @swagger
 * /api/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
router.post(
  '/:id/cancel',
  authMiddleware,
  subscriptionController.cancelSubscription,
);

module.exports = router;
