const db = require('../config/db');
const bcrypt = require('bcrypt');
const notificationService = require('../services/notificationService');

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

    if (result.rows[0]) {
      await this.initializeNotificationPreferences(result.rows[0].user_id);
    }

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
             current_losing_streak, total_study_time, subscription_type, role
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
             role, auth_id, oauth_provider
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

  // Create OAuth user (no password required)
  async createOAuthUser(username, email, authId, provider) {
    try {
      const query = `
        INSERT INTO users (
          username, email, password_hash, auth_id, oauth_provider,
          subscription_type, role, total_duels, duels_won, 
          duels_lost, longest_losing_streak, current_losing_streak, 
          total_study_time
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, 0, 0)
        RETURNING user_id, username, email, subscription_type, role, 
                  date_registered, auth_id, oauth_provider
      `;

      // Use a placeholder password hash for OAuth users
      const placeholderHash = await bcrypt.hash(
        `oauth_${provider}_${Date.now()}`,
        10,
      );

      const result = await db.query(query, [
        username,
        email,
        placeholderHash,
        authId,
        provider,
        'free',
        'student',
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating OAuth user:', error);
      throw error;
    }
  },

  // Check if email exists (for OAuth conflict resolution)
  async checkEmailExists(email) {
    try {
      const query =
        'SELECT user_id, auth_id, oauth_provider FROM users WHERE email = $1';
      const result = await db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error checking email exists:', error);
      throw error;
    }
  },

  // Link OAuth provider to existing user
  async linkOAuthProvider(userId, provider, authId) {
    try {
      const query = `
        UPDATE users 
        SET oauth_provider = $2, auth_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING user_id, username, email, oauth_provider, auth_id
      `;

      const result = await db.query(query, [userId, provider, authId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error linking OAuth provider:', error);
      throw error;
    }
  },

  // Update user OAuth info
  async updateOAuthInfo(userId, provider, authId) {
    try {
      const query = `
        UPDATE users 
        SET oauth_provider = $2, auth_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `;

      const result = await db.query(query, [userId, provider, authId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating OAuth info:', error);
      throw error;
    }
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

  // Get user by email with OAuth info
  async findByEmailWithOAuth(email) {
    try {
      const query = `
        SELECT user_id, username, email, password_hash, date_registered, 
               total_duels, duels_won, duels_lost, longest_losing_streak, 
               current_losing_streak, total_study_time, subscription_type,
               role, auth_id, oauth_provider
        FROM users
        WHERE email = $1
      `;

      const result = await db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email with OAuth:', error);
      throw error;
    }
  },

  // Delete user (for cleanup/testing)
  async deleteUser(userId) {
    try {
      const query = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id';
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Get OAuth users count by provider
  async getOAuthStats() {
    try {
      const query = `
        SELECT 
          oauth_provider,
          COUNT(*) as user_count
        FROM users 
        WHERE oauth_provider IS NOT NULL
        GROUP BY oauth_provider
        ORDER BY user_count DESC
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting OAuth stats:', error);
      throw error;
    }
  },
  async initializeNotificationPreferences(userId) {
    try {
      return await notificationService.initializeDefaultPreferences(userId);
    } catch (error) {
      console.error('Error initializing notification preferences:', error);
      throw error;
    }
  },
};

module.exports = userModel;
