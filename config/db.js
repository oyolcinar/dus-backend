const { Pool } = require('pg');
require('dotenv').config();

// Debug environment variables
console.log('Environment variables check:');
console.log('DB_USER exists:', process.env.DB_USER ? 'YES' : 'NO');
console.log('DB_PASSWORD exists:', process.env.DB_PASSWORD ? 'YES' : 'NO');
console.log('DB_HOST exists:', process.env.DB_HOST ? 'YES' : 'NO');
console.log('DB_PORT exists:', process.env.DB_PORT ? 'YES' : 'NO');
console.log('DB_DATABASE exists:', process.env.DB_DATABASE ? 'YES' : 'NO');

// Use direct parameter approach instead of connection string
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_DATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
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
