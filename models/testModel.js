const db = require('../config/db');

const testModel = {
  // Create a new test
  async create(title, description, difficultyLevel) {
    const query = `
      INSERT INTO tests (title, description, difficulty_level)
      VALUES ($1, $2, $3)
      RETURNING test_id, title, description, difficulty_level, created_at
    `;

    const values = [title, description, difficultyLevel];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get all tests
  async getAll() {
    const query = `
      SELECT test_id, title, description, difficulty_level, created_at
      FROM tests
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);
    return result.rows;
  },

  // Get test by ID
  async getById(testId) {
    const query = `
      SELECT test_id, title, description, difficulty_level, created_at
      FROM tests
      WHERE test_id = $1
    `;

    const result = await db.query(query, [testId]);
    return result.rows[0];
  },

  // Update test
  async update(testId, title, description, difficultyLevel) {
    const query = `
      UPDATE tests
      SET title = $2, description = $3, difficulty_level = $4
      WHERE test_id = $1
      RETURNING test_id, title, description, difficulty_level, created_at
    `;

    const values = [testId, title, description, difficultyLevel];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete test
  async delete(testId) {
    const query = `
      DELETE FROM tests
      WHERE test_id = $1
      RETURNING test_id
    `;

    const result = await db.query(query, [testId]);
    return result.rows[0];
  },
};

module.exports = testModel;
