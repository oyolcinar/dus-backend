const db = require('../config/db');

const questionModel = {
  // Create a new question
  async create(testId, questionText, options, correctAnswer) {
    const query = `
      INSERT INTO test_questions (test_id, question_text, options, correct_answer)
      VALUES ($1, $2, $3, $4)
      RETURNING question_id, test_id, question_text, options, correct_answer, created_at
    `;

    const values = [testId, questionText, options, correctAnswer];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get questions by test ID
  async getByTestId(testId) {
    const query = `
      SELECT question_id, test_id, question_text, options, correct_answer, created_at
      FROM test_questions
      WHERE test_id = $1
      ORDER BY question_id
    `;

    const result = await db.query(query, [testId]);
    return result.rows;
  },

  // Get question by ID
  async getById(questionId) {
    const query = `
      SELECT question_id, test_id, question_text, options, correct_answer, created_at
      FROM test_questions
      WHERE question_id = $1
    `;

    const result = await db.query(query, [questionId]);
    return result.rows[0];
  },

  // Update question
  async update(questionId, questionText, options, correctAnswer) {
    const query = `
      UPDATE test_questions
      SET question_text = $2, options = $3, correct_answer = $4
      WHERE question_id = $1
      RETURNING question_id, test_id, question_text, options, correct_answer, created_at
    `;

    const values = [questionId, questionText, options, correctAnswer];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete question
  async delete(questionId) {
    const query = `
      DELETE FROM test_questions
      WHERE question_id = $1
      RETURNING question_id
    `;

    const result = await db.query(query, [questionId]);
    return result.rows[0];
  },
};

module.exports = questionModel;
