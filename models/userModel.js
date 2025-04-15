const db = require('../config/db');
const bcrypt = require('bcrypt');

const userModel = {
  // Create a new user
  async create(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, email, password_hash, total_duels, duels_won, duels_lost, longest_losing_streak, current_losing_streak, total_study_time, subscription_type)
      VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 'free')
      RETURNING user_id, username, email, date_registered, total_duels, duels_won, duels_lost, longest_losing_streak, current_losing_streak, total_study_time, subscription_type
    `;

    const values = [username, email, hashedPassword];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Find user by email
  async findByEmail(email) {
    const query = `
      SELECT user_id, username, email, password_hash, date_registered, 
             total_duels, duels_won, duels_lost, longest_losing_streak, 
             current_losing_streak, total_study_time, subscription_type
      FROM users
      WHERE email = $1
    `;

    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  // Find user by ID
  async findById(userId) {
    const query = `
      SELECT user_id, username, email, date_registered, 
             total_duels, duels_won, duels_lost, longest_losing_streak,
             current_losing_streak, total_study_time, subscription_type
      FROM users
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Update user's duel statistics
  async updateDuelStats(userId, isWin) {
    let query;

    if (isWin === true) {
      query = `
        UPDATE users
        SET total_duels = total_duels + 1, 
            duels_won = duels_won + 1,
            current_losing_streak = 0
        WHERE user_id = $1
        RETURNING user_id, total_duels, duels_won, duels_lost, longest_losing_streak, current_losing_streak
      `;
    } else if (isWin === false) {
      query = `
        UPDATE users
        SET total_duels = total_duels + 1, 
            duels_lost = duels_lost + 1,
            current_losing_streak = current_losing_streak + 1,
            longest_losing_streak = GREATEST(longest_losing_streak, current_losing_streak + 1)
        WHERE user_id = $1
        RETURNING user_id, total_duels, duels_won, duels_lost, longest_losing_streak, current_losing_streak
      `;
    } else {
      // Draw or participation
      query = `
        UPDATE users
        SET total_duels = total_duels + 1
        WHERE user_id = $1
        RETURNING user_id, total_duels, duels_won, duels_lost, longest_losing_streak, current_losing_streak
      `;
    }

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Get user's duel statistics
  async getDuelStats(userId) {
    const query = `
      SELECT total_duels, duels_won, duels_lost, longest_losing_streak, current_losing_streak,
             CASE 
               WHEN total_duels > 0 THEN (duels_won::float / total_duels) * 100 
               ELSE 0 
             END as win_rate
      FROM users
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Update study time
  async updateStudyTime(userId, durationInSeconds) {
    const query = `
      UPDATE users
      SET total_study_time = total_study_time + $2
      WHERE user_id = $1
      RETURNING user_id, total_study_time
    `;

    const result = await db.query(query, [userId, durationInSeconds]);
    return result.rows[0];
  },

  // Update subscription type
  async updateSubscriptionType(userId, subscriptionType) {
    const query = `
      UPDATE users
      SET subscription_type = $2
      WHERE user_id = $1
      RETURNING user_id, subscription_type
    `;

    const result = await db.query(query, [userId, subscriptionType]);
    return result.rows[0];
  },

  // Search users by username or email
  async searchUsers(searchTerm, limit = 10) {
    const query = `
      SELECT user_id, username, email, date_registered
      FROM users
      WHERE username ILIKE $1 OR email ILIKE $1
      LIMIT $2
    `;

    const result = await db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  },
};

module.exports = userModel;
