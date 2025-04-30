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
  // Find user by Supabase auth_id
  async findByAuthId(authId) {
    const query = `
    SELECT user_id, username, email, password_hash, date_registered, 
           total_duels, duels_won, duels_lost, longest_losing_streak, 
           current_losing_streak, total_study_time, subscription_type,
           role, auth_id
    FROM users
    WHERE auth_id = $1
  `;

    const result = await db.query(query, [authId]);
    return result.rows[0];
  },

  // Create a new user with auth_id
  async createWithAuthId(username, email, password, authId) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
    INSERT INTO users (
      username, email, password_hash, total_duels, duels_won, 
      duels_lost, longest_losing_streak, current_losing_streak, 
      total_study_time, subscription_type, auth_id, role
    )
    VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 'free', $4, 'student')
    RETURNING user_id, username, email, date_registered, total_duels, 
              duels_won, duels_lost, longest_losing_streak, current_losing_streak, 
              total_study_time, subscription_type, role, auth_id
  `;

    const values = [username, email, hashedPassword, authId];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Link existing user to Supabase auth_id
  async linkUserToAuthId(userId, authId) {
    const query = `
    UPDATE users
    SET auth_id = $2
    WHERE user_id = $1
    RETURNING user_id, auth_id
  `;

    const result = await db.query(query, [userId, authId]);
    return result.rows[0];
  },

  // Get user role and permissions
  async getUserRoleAndPermissions(userId) {
    const query = `
    SELECT u.role, 
           ARRAY_AGG(p.name) AS permissions
    FROM users u
    LEFT JOIN role_permissions rp ON u.role = rp.role
    LEFT JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE u.user_id = $1
    GROUP BY u.role
  `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Get all permissions for a role
  async getRolePermissions(role) {
    const query = `
    SELECT p.name, p.description
    FROM permissions p
    JOIN role_permissions rp ON p.permission_id = rp.permission_id
    WHERE rp.role = $1
  `;

    const result = await db.query(query, [role]);
    return result.rows;
  },

  // Update a user's role
  async updateUserRole(userId, role) {
    const query = `
    UPDATE users
    SET role = $2
    WHERE user_id = $1
    RETURNING user_id, username, email, role
  `;

    const result = await db.query(query, [userId, role]);
    return result.rows[0];
  },
};

module.exports = userModel;
