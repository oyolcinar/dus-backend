const db = require('../config/db');

const answerModel = {
  // Create a new user answer
  async create(resultId, questionId, userAnswer, isCorrect) {
    const query = `
      INSERT INTO user_answers (result_id, question_id, user_answer, is_correct)
      VALUES ($1, $2, $3, $4)
      RETURNING answer_id, result_id, question_id, user_answer, is_correct, created_at
    `;

    const values = [resultId, questionId, userAnswer, isCorrect];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Create multiple user answers in a transaction
  async createBatch(answers) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const createdAnswers = [];

      for (const answer of answers) {
        const { resultId, questionId, userAnswer, isCorrect } = answer;

        const query = `
          INSERT INTO user_answers (result_id, question_id, user_answer, is_correct)
          VALUES ($1, $2, $3, $4)
          RETURNING answer_id, result_id, question_id, user_answer, is_correct, created_at
        `;

        const values = [resultId, questionId, userAnswer, isCorrect];
        const result = await client.query(query, values);

        createdAnswers.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return createdAnswers;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get answers by result ID
  async getByResultId(resultId) {
    const query = `
      SELECT a.answer_id, a.result_id, a.question_id, a.user_answer, a.is_correct, a.created_at,
             q.question_text, q.options, q.correct_answer
      FROM user_answers a
      JOIN test_questions q ON a.question_id = q.question_id
      WHERE a.result_id = $1
      ORDER BY a.answer_id
    `;

    const result = await db.query(query, [resultId]);
    return result.rows;
  },
};

module.exports = answerModel;
