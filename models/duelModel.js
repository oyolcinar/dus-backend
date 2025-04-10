const db = require('../config/db');

const duelModel = {
  // Create a new duel challenge
  async create(initiatorId, opponentId, testId) {
    const query = `
      INSERT INTO duels (initiator_id, opponent_id, test_id, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING duel_id, initiator_id, opponent_id, test_id, status, start_time, end_time, created_at
    `;

    const values = [initiatorId, opponentId, testId];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get duel by ID
  async getById(duelId) {
    const query = `
      SELECT d.duel_id, d.initiator_id, d.opponent_id, d.test_id, d.status, 
             d.start_time, d.end_time, d.created_at,
             i.username as initiator_username, 
             o.username as opponent_username,
             t.title as test_title
      FROM duels d
      JOIN users i ON d.initiator_id = i.user_id
      JOIN users o ON d.opponent_id = o.user_id
      JOIN tests t ON d.test_id = t.test_id
      WHERE d.duel_id = $1
    `;

    const result = await db.query(query, [duelId]);
    return result.rows[0];
  },

  // Get pending duels for a user
  async getPendingByUserId(userId) {
    const query = `
      SELECT d.duel_id, d.initiator_id, d.opponent_id, d.test_id, d.status, 
             d.created_at, i.username as initiator_username, 
             o.username as opponent_username, t.title as test_title
      FROM duels d
      JOIN users i ON d.initiator_id = i.user_id
      JOIN users o ON d.opponent_id = o.user_id
      JOIN tests t ON d.test_id = t.test_id
      WHERE d.opponent_id = $1 AND d.status = 'pending'
      ORDER BY d.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get active duels for a user
  async getActiveByUserId(userId) {
    const query = `
      SELECT d.duel_id, d.initiator_id, d.opponent_id, d.test_id, d.status, 
             d.start_time, d.created_at, i.username as initiator_username, 
             o.username as opponent_username, t.title as test_title
      FROM duels d
      JOIN users i ON d.initiator_id = i.user_id
      JOIN users o ON d.opponent_id = o.user_id
      JOIN tests t ON d.test_id = t.test_id
      WHERE (d.initiator_id = $1 OR d.opponent_id = $1) AND d.status = 'active'
      ORDER BY d.start_time DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get completed duels for a user
  async getCompletedByUserId(userId) {
    const query = `
      SELECT d.duel_id, d.initiator_id, d.opponent_id, d.test_id, d.status, 
             d.start_time, d.end_time, d.created_at, 
             i.username as initiator_username, 
             o.username as opponent_username,
             t.title as test_title,
             dr.winner_id, dr.initiator_score, dr.opponent_score,
             CASE WHEN dr.winner_id = $1 THEN true ELSE false END as is_winner
      FROM duels d
      JOIN users i ON d.initiator_id = i.user_id
      JOIN users o ON d.opponent_id = o.user_id
      JOIN tests t ON d.test_id = t.test_id
      JOIN duel_results dr ON d.duel_id = dr.duel_id
      WHERE (d.initiator_id = $1 OR d.opponent_id = $1) AND d.status = 'completed'
      ORDER BY d.end_time DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Accept a duel challenge
  async accept(duelId) {
    const query = `
      UPDATE duels
      SET status = 'active', start_time = NOW()
      WHERE duel_id = $1 AND status = 'pending'
      RETURNING duel_id, initiator_id, opponent_id, test_id, status, start_time, end_time, created_at
    `;

    const result = await db.query(query, [duelId]);
    return result.rows[0];
  },

  // Decline a duel challenge
  async decline(duelId) {
    const query = `
      DELETE FROM duels
      WHERE duel_id = $1 AND status = 'pending'
      RETURNING duel_id
    `;

    const result = await db.query(query, [duelId]);
    return result.rows[0];
  },

  // Complete a duel
  async complete(duelId) {
    const query = `
      UPDATE duels
      SET status = 'completed', end_time = NOW()
      WHERE duel_id = $1 AND status = 'active'
      RETURNING duel_id, initiator_id, opponent_id, test_id, status, start_time, end_time, created_at
    `;

    const result = await db.query(query, [duelId]);
    return result.rows[0];
  },
};

module.exports = duelModel;
