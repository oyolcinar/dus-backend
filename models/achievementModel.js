const db = require('../config/db');

const achievementModel = {
  // Create a new achievement
  async create(name, description, requirements) {
    const query = `
      INSERT INTO achievements (name, description, requirements)
      VALUES ($1, $2, $3)
      RETURNING achievement_id, name, description, requirements, created_at
    `;

    const values = [name, description, requirements];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get all achievements
  async getAll() {
    const query = `
      SELECT achievement_id, name, description, requirements, created_at
      FROM achievements
      ORDER BY achievement_id
    `;

    const result = await db.query(query);
    return result.rows;
  },

  // Get achievement by ID
  async getById(achievementId) {
    const query = `
      SELECT achievement_id, name, description, requirements, created_at
      FROM achievements
      WHERE achievement_id = $1
    `;

    const result = await db.query(query, [achievementId]);
    return result.rows[0];
  },

  // Update achievement
  async update(achievementId, name, description, requirements) {
    const query = `
      UPDATE achievements
      SET name = $2, description = $3, requirements = $4
      WHERE achievement_id = $1
      RETURNING achievement_id, name, description, requirements, created_at
    `;

    const values = [achievementId, name, description, requirements];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete achievement
  async delete(achievementId) {
    const query = `
      DELETE FROM achievements
      WHERE achievement_id = $1
      RETURNING achievement_id
    `;

    const result = await db.query(query, [achievementId]);
    return result.rows[0];
  },

  // Award achievement to user
  async awardToUser(userId, achievementId) {
    const query = `
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING user_id, achievement_id, date_earned
    `;

    const values = [userId, achievementId];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get user's achievements
  async getUserAchievements(userId) {
    const query = `
      SELECT a.achievement_id, a.name, a.description, a.requirements, ua.date_earned
      FROM achievements a
      JOIN user_achievements ua ON a.achievement_id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.date_earned DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Check if user has achievement
  async userHasAchievement(userId, achievementId) {
    const query = `
      SELECT 1
      FROM user_achievements
      WHERE user_id = $1 AND achievement_id = $2
    `;

    const result = await db.query(query, [userId, achievementId]);
    return result.rows.length > 0;
  },
};

module.exports = achievementModel;
