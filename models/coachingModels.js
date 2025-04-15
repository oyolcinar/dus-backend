const db = require('../config/db');

// Coaching Notes Model
const coachingNoteModel = {
  // Create a new coaching note
  async create(title, content, publishDate, weekNumber, year) {
    const query = `
      INSERT INTO coaching_notes (title, content, publish_date, week_number, year)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING note_id, title, content, publish_date, week_number, year, created_at
    `;

    const values = [title, content, publishDate, weekNumber, year];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get all coaching notes
  async getAll() {
    const query = `
      SELECT note_id, title, content, publish_date, week_number, year, created_at
      FROM coaching_notes
      ORDER BY publish_date DESC
    `;

    const result = await db.query(query);
    return result.rows;
  },

  // Get latest coaching note
  async getLatest() {
    const query = `
      SELECT note_id, title, content, publish_date, week_number, year, created_at
      FROM coaching_notes
      ORDER BY publish_date DESC
      LIMIT 1
    `;

    const result = await db.query(query);
    return result.rows[0];
  },

  // Get note by ID
  async getById(noteId) {
    const query = `
      SELECT note_id, title, content, publish_date, week_number, year, created_at
      FROM coaching_notes
      WHERE note_id = $1
    `;

    const result = await db.query(query, [noteId]);
    return result.rows[0];
  },

  // Update note
  async update(noteId, title, content, publishDate, weekNumber, year) {
    const query = `
      UPDATE coaching_notes
      SET title = $2, content = $3, publish_date = $4, week_number = $5, year = $6
      WHERE note_id = $1
      RETURNING note_id, title, content, publish_date, week_number, year, created_at
    `;

    const values = [noteId, title, content, publishDate, weekNumber, year];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete note
  async delete(noteId) {
    const query = `
      DELETE FROM coaching_notes
      WHERE note_id = $1
      RETURNING note_id
    `;

    const result = await db.query(query, [noteId]);
    return result.rows[0];
  },
};

// Motivational Messages Model
const motivationalMessageModel = {
  // Create a new motivational message
  async create(title, audioUrl, description, publishDate) {
    const query = `
      INSERT INTO motivational_messages (title, audio_url, description, publish_date)
      VALUES ($1, $2, $3, $4)
      RETURNING message_id, title, audio_url, description, publish_date, created_at
    `;

    const values = [title, audioUrl, description, publishDate];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get all motivational messages
  async getAll() {
    const query = `
      SELECT message_id, title, audio_url, description, publish_date, created_at
      FROM motivational_messages
      ORDER BY publish_date DESC
    `;

    const result = await db.query(query);
    return result.rows;
  },

  // Get message by ID
  async getById(messageId) {
    const query = `
      SELECT message_id, title, audio_url, description, publish_date, created_at
      FROM motivational_messages
      WHERE message_id = $1
    `;

    const result = await db.query(query, [messageId]);
    return result.rows[0];
  },

  // Update message
  async update(messageId, title, audioUrl, description, publishDate) {
    const query = `
      UPDATE motivational_messages
      SET title = $2, audio_url = $3, description = $4, publish_date = $5
      WHERE message_id = $1
      RETURNING message_id, title, audio_url, description, publish_date, created_at
    `;

    const values = [messageId, title, audioUrl, description, publishDate];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete message
  async delete(messageId) {
    const query = `
      DELETE FROM motivational_messages
      WHERE message_id = $1
      RETURNING message_id
    `;

    const result = await db.query(query, [messageId]);
    return result.rows[0];
  },
};

// Strategy Videos Model
const strategyVideoModel = {
  // Create a new strategy video
  async create(title, externalUrl, description, isPremium) {
    const query = `
      INSERT INTO strategy_videos (title, external_url, description, is_premium)
      VALUES ($1, $2, $3, $4)
      RETURNING video_id, title, external_url, description, is_premium, created_at
    `;

    const values = [title, externalUrl, description, isPremium];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get all strategy videos
  async getAll(isPremium = null) {
    let query;
    let params = [];

    if (isPremium !== null) {
      query = `
        SELECT video_id, title, external_url, description, is_premium, created_at
        FROM strategy_videos
        WHERE is_premium = $1
        ORDER BY created_at DESC
      `;
      params = [isPremium];
    } else {
      query = `
        SELECT video_id, title, external_url, description, is_premium, created_at
        FROM strategy_videos
        ORDER BY created_at DESC
      `;
    }

    const result = await db.query(query, params);
    return result.rows;
  },

  // Get video by ID
  async getById(videoId) {
    const query = `
      SELECT video_id, title, external_url, description, is_premium, created_at
      FROM strategy_videos
      WHERE video_id = $1
    `;

    const result = await db.query(query, [videoId]);
    return result.rows[0];
  },

  // Update video
  async update(videoId, title, externalUrl, description, isPremium) {
    const query = `
      UPDATE strategy_videos
      SET title = $2, external_url = $3, description = $4, is_premium = $5
      WHERE video_id = $1
      RETURNING video_id, title, external_url, description, is_premium, created_at
    `;

    const values = [videoId, title, externalUrl, description, isPremium];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete video
  async delete(videoId) {
    const query = `
      DELETE FROM strategy_videos
      WHERE video_id = $1
      RETURNING video_id
    `;

    const result = await db.query(query, [videoId]);
    return result.rows[0];
  },
};

module.exports = {
  coachingNoteModel,
  motivationalMessageModel,
  strategyVideoModel,
};
