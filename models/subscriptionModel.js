const db = require('../config/db');

const subscriptionModel = {
  // Create a new subscription
  async create(
    userId,
    subscriptionType,
    startDate,
    endDate,
    paymentReference,
    amount,
  ) {
    const query = `
      INSERT INTO subscriptions (user_id, subscription_type, start_date, end_date, payment_reference, amount, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING subscription_id, user_id, subscription_type, start_date, end_date, payment_reference, amount, is_active, created_at
    `;

    const values = [
      userId,
      subscriptionType,
      startDate,
      endDate,
      paymentReference,
      amount,
    ];
    const result = await db.query(query, values);

    // Update user's subscription type
    await db.query(
      `
      UPDATE users
      SET subscription_type = $1
      WHERE user_id = $2
    `,
      [subscriptionType, userId],
    );

    return result.rows[0];
  },

  // Get user's active subscription
  async getActiveSubscription(userId) {
    const query = `
      SELECT subscription_id, user_id, subscription_type, start_date, end_date, payment_reference, amount, is_active, created_at
      FROM subscriptions
      WHERE user_id = $1 AND is_active = true AND end_date >= CURRENT_DATE
      ORDER BY end_date DESC
      LIMIT 1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Get user's subscription history
  async getUserSubscriptions(userId) {
    const query = `
      SELECT subscription_id, user_id, subscription_type, start_date, end_date, payment_reference, amount, is_active, created_at
      FROM subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    const query = `
      UPDATE subscriptions
      SET is_active = false
      WHERE subscription_id = $1
      RETURNING subscription_id, user_id, subscription_type, start_date, end_date, payment_reference, amount, is_active, created_at
    `;

    const result = await db.query(query, [subscriptionId]);

    // If no more active subscriptions, revert user to free
    if (result.rows[0]) {
      const { user_id } = result.rows[0];
      const activeSubscriptions = await this.getActiveSubscription(user_id);

      if (!activeSubscriptions) {
        await db.query(
          `
          UPDATE users
          SET subscription_type = 'free'
          WHERE user_id = $1
        `,
          [user_id],
        );
      }
    }

    return result.rows[0];
  },
};

module.exports = subscriptionModel;
