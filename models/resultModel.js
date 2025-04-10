const db = require('../config/db');

const resultModel = {
  // Create a new test result
  async create(userId, testId, score, timeTaken) {
    const query = `
      INSERT INTO user_test_results (user_id, test_id, score, time_taken)
      VALUES ($1, $2, $3, $4)
      RETURNING result_id, user_id, test_id, score, time_taken, date_taken
    `;

    const values = [userId, testId, score, timeTaken];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get results by user ID
  async getByUserId(userId) {
    const query = `
      SELECT r.result_id, r.user_id, r.test_id, r.score, r.time_taken, r.date_taken,
             t.title as test_title, t.difficulty_level
      FROM user_test_results r
      JOIN tests t ON r.test_id = t.test_id
      WHERE r.user_id = $1
      ORDER BY r.date_taken DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get result by ID
  async getById(resultId) {
    const query = `
      SELECT r.result_id, r.user_id, r.test_id, r.score, r.time_taken, r.date_taken,
             t.title as test_title, t.difficulty_level
      FROM user_test_results r
      JOIN tests t ON r.test_id = t.test_id
      WHERE r.result_id = $1
    `;

    const result = await db.query(query, [resultId]);
    return result.rows[0];
  },

  // Get average score for a test
  async getAverageScoreByTest(testId) {
    const query = `
      SELECT AVG(score) as average_score, COUNT(*) as attempt_count
      FROM user_test_results
      WHERE test_id = $1
    `;

    const result = await db.query(query, [testId]);
    return result.rows[0];
  },
};

module.exports = resultModel;
