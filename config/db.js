const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'postgres',
  password: process.env.DB_PASSWORD, // Get password from environment variable
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false }, // Required for Supabase connections
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
