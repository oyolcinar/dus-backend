const subscriptionModel = require('../models/subscriptionModel');

const subscriptionController = {
  // Create a new subscription
  async create(req, res) {
    try {
      const userId = req.user.userId;
      const { subscriptionType, startDate, endDate, paymentReference, amount } =
        req.body;

      // Validate input
      if (!subscriptionType || !startDate || !endDate) {
        return res
          .status(400)
          .json({
            message: 'Subscription type, start date, and end date are required',
          });
      }

      // Create subscription
      const newSubscription = await subscriptionModel.create(
        userId,
        subscriptionType,
        startDate,
        endDate,
        paymentReference || null,
        amount || null,
      );

      res.status(201).json({
        message: 'Subscription created successfully',
        subscription: newSubscription,
      });
    } catch (error) {
      console.error('Subscription creation error:', error);
      res.status(500).json({ message: 'Failed to create subscription' });
    }
  },

  // Get user's active subscription
  async getActiveSubscription(req, res) {
    try {
      const userId = req.user.userId;

      const subscription = await subscriptionModel.getActiveSubscription(
        userId,
      );
      if (!subscription) {
        return res.json({
          active: false,
          message: 'No active subscription found',
          subscription: null,
        });
      }

      res.json({
        active: true,
        subscription,
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ message: 'Failed to retrieve subscription' });
    }
  },

  // Get user's subscription history
  async getUserSubscriptions(req, res) {
    try {
      const userId = req.user.userId;

      const subscriptions = await subscriptionModel.getUserSubscriptions(
        userId,
      );
      res.json(subscriptions);
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({ message: 'Failed to retrieve subscriptions' });
    }
  },

  // Cancel subscription
  async cancelSubscription(req, res) {
    try {
      const subscriptionId = req.params.id;

      const subscription = await subscriptionModel.cancelSubscription(
        subscriptionId,
      );
      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      res.json({
        message: 'Subscription cancelled successfully',
        subscription,
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ message: 'Failed to cancel subscription' });
    }
  },
};

module.exports = subscriptionController;
