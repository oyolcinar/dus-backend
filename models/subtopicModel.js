const db = require('../config/db');

const subtopicModel = {
  // Create a new subtopic
  async create(topicId, title, description, orderIndex) {
    const query = `
      INSERT INTO subtopics (topic_id, title, description, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING subtopic_id, topic_id, title, description, order_index, created_at
    `;

    const values = [topicId, title, description, orderIndex];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get subtopics by topic ID
  async getByTopicId(topicId) {
    const query = `
      SELECT subtopic_id, topic_id, title, description, order_index, created_at
      FROM subtopics
      WHERE topic_id = $1
      ORDER BY order_index
    `;

    const result = await db.query(query, [topicId]);
    return result.rows;
  },

  // Get subtopic by ID
  async getById(subtopicId) {
    const query = `
      SELECT subtopic_id, topic_id, title, description, order_index, created_at
      FROM subtopics
      WHERE subtopic_id = $1
    `;

    const result = await db.query(query, [subtopicId]);
    return result.rows[0];
  },

  // Update subtopic
  async update(subtopicId, title, description, orderIndex) {
    const query = `
      UPDATE subtopics
      SET title = $2, description = $3, order_index = $4
      WHERE subtopic_id = $1
      RETURNING subtopic_id, topic_id, title, description, order_index, created_at
    `;

    const values = [subtopicId, title, description, orderIndex];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete subtopic
  async delete(subtopicId) {
    const query = `
      DELETE FROM subtopics
      WHERE subtopic_id = $1
      RETURNING subtopic_id
    `;

    const result = await db.query(query, [subtopicId]);
    return result.rows[0];
  },
};

module.exports = subtopicModel;
