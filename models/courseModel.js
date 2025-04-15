const db = require('../config/db');

const courseModel = {
  // Create a new course
  async create(title, description, imageUrl) {
    const query = `
      INSERT INTO courses (title, description, image_url)
      VALUES ($1, $2, $3)
      RETURNING course_id, title, description, image_url, created_at
    `;

    const values = [title, description, imageUrl];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get all courses
  async getAll() {
    const query = `
      SELECT course_id, title, description, image_url, created_at
      FROM courses
      ORDER BY title
    `;

    const result = await db.query(query);
    return result.rows;
  },

  // Get course by ID
  async getById(courseId) {
    const query = `
      SELECT course_id, title, description, image_url, created_at
      FROM courses
      WHERE course_id = $1
    `;

    const result = await db.query(query, [courseId]);
    return result.rows[0];
  },

  // Update course
  async update(courseId, title, description, imageUrl) {
    const query = `
      UPDATE courses
      SET title = $2, description = $3, image_url = $4
      WHERE course_id = $1
      RETURNING course_id, title, description, image_url, created_at
    `;

    const values = [courseId, title, description, imageUrl];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete course
  async delete(courseId) {
    const query = `
      DELETE FROM courses
      WHERE course_id = $1
      RETURNING course_id
    `;

    const result = await db.query(query, [courseId]);
    return result.rows[0];
  },
};

module.exports = courseModel;
