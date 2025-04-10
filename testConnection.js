const db = require('./config/db');

async function testConnection() {
  try {
    const result = await db.query('SELECT NOW() as current_time');
    console.log('Database connection successful!');
    console.log('Current time from database:', result.rows[0].current_time);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();
