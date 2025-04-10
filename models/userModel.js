const db = require('../config/db');
const bcrypt = require('bcrypt');

const userModel = {
  // Create a new user
  async create(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING user_id, username, email, date_registered
    `;

    const values = [username, email, hashedPassword];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Find user by email
  async findByEmail(email) {
    const query = `
      SELECT user_id, username, email, password_hash, date_registered
      FROM users
      WHERE email = $1
    `;

    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  // Find user by ID
  async findById(userId) {
    const query = `
      SELECT user_id, username, email, date_registered
      FROM users
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },
};

module.exports = userModel;
