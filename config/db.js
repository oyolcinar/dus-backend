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

// Add this specific connection test
console.log('Attempting direct connection with full connection string...');
const { Client } = require('pg');
const client = new Client({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`,
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(() => console.log('Direct connection successful'))
  .catch((err) => console.error('Direct connection error:', err))
  .finally(() => client.end());
