const db = require('../config/db');

const duelResultModel = {
  // Record duel result
  async create(duelId, winnerId, initiatorScore, opponentScore) {
    const query = `
      INSERT INTO duel_results (duel_id, winner_id, initiator_score, opponent_score)
      VALUES ($1, $2, $3, $4)
      RETURNING duel_id, winner_id, initiator_score, opponent_score, created_at
    `;

    const values = [duelId, winnerId, initiatorScore, opponentScore];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get result by duel ID
  async getByDuelId(duelId) {
    const query = `
      SELECT dr.duel_id, dr.winner_id, dr.initiator_score, dr.opponent_score, dr.created_at,
             u.username as winner_username
      FROM duel_results dr
      LEFT JOIN users u ON dr.winner_id = u.user_id
      WHERE dr.duel_id = $1
    `;

    const result = await db.query(query, [duelId]);
    return result.rows[0];
  },

  // Get user's win/loss statistics
  async getUserStats(userId) {
    const query = `
      SELECT 
        COUNT(CASE WHEN dr.winner_id = $1 THEN 1 END) as wins,
        COUNT(CASE WHEN (d.initiator_id = $1 OR d.opponent_id = $1) AND dr.winner_id != $1 THEN 1 END) as losses,
        COALESCE(AVG(CASE WHEN d.initiator_id = $1 THEN dr.initiator_score WHEN d.opponent_id = $1 THEN dr.opponent_score END), 0) as avg_score
      FROM duel_results dr
      JOIN duels d ON dr.duel_id = d.duel_id
      WHERE d.initiator_id = $1 OR d.opponent_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },
};

module.exports = duelResultModel;
