const db = require('../config/db');

// Study Progress Model
const progressModel = {
  // Update or create study progress
  async updateProgress(userId, subtopicId, repetitionCount, masteryLevel) {
    const query = `
      INSERT INTO user_study_progress (user_id, subtopic_id, repetition_count, mastery_level, last_studied_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, subtopic_id) 
      DO UPDATE SET 
        repetition_count = $3, 
        mastery_level = $4, 
        last_studied_at = NOW()
      RETURNING progress_id, user_id, subtopic_id, repetition_count, mastery_level, last_studied_at
    `;

    const values = [userId, subtopicId, repetitionCount, masteryLevel];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get user's progress for all subtopics
  async getUserProgress(userId) {
    const query = `
      SELECT p.progress_id, p.user_id, p.subtopic_id, p.repetition_count, p.mastery_level, 
             p.last_studied_at, s.title as subtopic_title, t.title as topic_title,
             c.title as course_title
      FROM user_study_progress p
      JOIN subtopics s ON p.subtopic_id = s.subtopic_id
      JOIN topics t ON s.topic_id = t.topic_id
      JOIN courses c ON t.course_id = c.course_id
      WHERE p.user_id = $1
      ORDER BY p.last_studied_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get progress for specific subtopic
  async getSubtopicProgress(userId, subtopicId) {
    const query = `
      SELECT progress_id, user_id, subtopic_id, repetition_count, mastery_level, last_studied_at
      FROM user_study_progress
      WHERE user_id = $1 AND subtopic_id = $2
    `;

    const values = [userId, subtopicId];
    const result = await db.query(query, values);

    return result.rows[0];
  },
};

// Study Session Model
const sessionModel = {
  // Start a new study session
  async startSession(userId) {
    const query = `
      INSERT INTO study_sessions (user_id, start_time)
      VALUES ($1, NOW())
      RETURNING session_id, user_id, start_time, created_at
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // End study session
  async endSession(sessionId) {
    const query = `
      UPDATE study_sessions
      SET end_time = NOW(), duration = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER
      WHERE session_id = $1
      RETURNING session_id, user_id, start_time, end_time, duration, created_at
    `;

    const result = await db.query(query, [sessionId]);

    // Update user's total study time
    if (result.rows[0]) {
      const { user_id, duration } = result.rows[0];
      await db.query(
        `
        UPDATE users
        SET total_study_time = total_study_time + $1
        WHERE user_id = $2
      `,
        [duration, user_id],
      );
    }

    return result.rows[0];
  },

  // Add session detail
  async addSessionDetail(sessionId, subtopicId, duration) {
    const query = `
      INSERT INTO session_details (session_id, subtopic_id, duration)
      VALUES ($1, $2, $3)
      RETURNING detail_id, session_id, subtopic_id, duration, created_at
    `;

    const values = [sessionId, subtopicId, duration];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get user's sessions
  async getUserSessions(userId) {
    const query = `
      SELECT session_id, user_id, start_time, end_time, duration, created_at
      FROM study_sessions
      WHERE user_id = $1
      ORDER BY start_time DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get session details
  async getSessionDetails(sessionId) {
    const query = `
      SELECT d.detail_id, d.session_id, d.subtopic_id, d.duration, d.created_at,
             s.title as subtopic_title, t.title as topic_title
      FROM session_details d
      JOIN subtopics s ON d.subtopic_id = s.subtopic_id
      JOIN topics t ON s.topic_id = t.topic_id
      WHERE d.session_id = $1
      ORDER BY d.created_at
    `;

    const result = await db.query(query, [sessionId]);
    return result.rows;
  },

  // Get study statistics
  async getStudyStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        SUM(duration) as total_duration,
        MAX(duration) as longest_session,
        AVG(duration) as average_session
      FROM study_sessions
      WHERE user_id = $1 AND end_time IS NOT NULL
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Get user's study time in the last 24 hours
  async getRecentStudyTime(userId) {
    const query = `
      SELECT COALESCE(SUM(duration), 0) as total_duration
      FROM study_sessions
      WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '24 hours'
      AND end_time IS NOT NULL
    `;

    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].total_duration) || 0;
  },

  // Get daily study time over last 7 days
  async getDailyStudyTime(userId) {
    const query = `
      SELECT 
        DATE(start_time) as study_date,
        COALESCE(SUM(duration), 0) as total_duration
      FROM study_sessions
      WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '7 days'
      AND end_time IS NOT NULL
      GROUP BY DATE(start_time)
      ORDER BY study_date
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get study time by topic
  async getStudyTimeByTopic(userId) {
    const query = `
      SELECT 
        t.topic_id, 
        t.title as topic_title, 
        COALESCE(SUM(sd.duration), 0) as total_duration
      FROM topics t
      LEFT JOIN subtopics s ON t.topic_id = s.topic_id
      LEFT JOIN session_details sd ON s.subtopic_id = sd.subtopic_id
      LEFT JOIN study_sessions ss ON sd.session_id = ss.session_id
      WHERE ss.user_id = $1 AND ss.end_time IS NOT NULL
      GROUP BY t.topic_id, t.title
      ORDER BY total_duration DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },
};

// User Error Analytics Model
const errorAnalyticsModel = {
  // Update error analytics
  async updateErrorAnalytics(userId, subtopicId, isError) {
    const query = `
      INSERT INTO user_error_analytics (user_id, subtopic_id, error_count, total_attempts, last_updated_at)
      VALUES ($1, $2, $3, 1, NOW())
      ON CONFLICT (user_id, subtopic_id) 
      DO UPDATE SET 
        error_count = user_error_analytics.error_count + $3, 
        total_attempts = user_error_analytics.total_attempts + 1,
        last_updated_at = NOW()
      RETURNING error_id, user_id, subtopic_id, error_count, total_attempts, last_updated_at
    `;

    const errorIncrement = isError ? 1 : 0;
    const values = [userId, subtopicId, errorIncrement];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get user's error analytics
  async getUserErrorAnalytics(userId) {
    const query = `
      SELECT a.error_id, a.user_id, a.subtopic_id, a.error_count, a.total_attempts, 
             a.last_updated_at, s.title as subtopic_title, t.title as topic_title,
             CASE 
               WHEN a.total_attempts > 0 THEN (a.error_count::float / a.total_attempts) * 100 
               ELSE 0 
             END as error_percentage
      FROM user_error_analytics a
      JOIN subtopics s ON a.subtopic_id = s.subtopic_id
      JOIN topics t ON s.topic_id = t.topic_id
      WHERE a.user_id = $1
      ORDER BY error_percentage DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get user's most problematic topics
  async getMostProblematicTopics(userId, limit = 5) {
    const query = `
      SELECT 
        t.topic_id, 
        t.title as topic_title, 
        SUM(a.error_count) as total_errors,
        SUM(a.total_attempts) as total_attempts,
        CASE 
          WHEN SUM(a.total_attempts) > 0 THEN (SUM(a.error_count)::float / SUM(a.total_attempts)) * 100 
          ELSE 0 
        END as error_rate
      FROM user_error_analytics a
      JOIN subtopics s ON a.subtopic_id = s.subtopic_id
      JOIN topics t ON s.topic_id = t.topic_id
      WHERE a.user_id = $1
      GROUP BY t.topic_id, t.title
      ORDER BY error_rate DESC, total_errors DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows;
  },

  // Get accuracy rate for each topic
  async getTopicAccuracyRates(userId) {
    const query = `
      SELECT 
        t.topic_id, 
        t.title as topic_title,
        SUM(a.total_attempts - a.error_count) as correct_answers,
        SUM(a.total_attempts) as total_attempts,
        CASE 
          WHEN SUM(a.total_attempts) > 0 THEN ((SUM(a.total_attempts) - SUM(a.error_count))::float / SUM(a.total_attempts)) * 100 
          ELSE 0 
        END as accuracy_rate
      FROM user_error_analytics a
      JOIN subtopics s ON a.subtopic_id = s.subtopic_id
      JOIN topics t ON s.topic_id = t.topic_id
      WHERE a.user_id = $1
      GROUP BY t.topic_id, t.title
      ORDER BY accuracy_rate DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },
};

module.exports = {
  progressModel,
  sessionModel,
  errorAnalyticsModel,
};
