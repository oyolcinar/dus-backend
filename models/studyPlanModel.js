const db = require('../config/db');

const studyPlanModel = {
  // Create a new study plan
  async create(userId, title, description, startDate, endDate, isCustom) {
    const query = `
      INSERT INTO study_plans (user_id, title, description, start_date, end_date, is_custom)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING plan_id, user_id, title, description, start_date, end_date, is_custom, created_at
    `;

    const values = [userId, title, description, startDate, endDate, isCustom];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get user's study plans
  async getUserPlans(userId) {
    const query = `
      SELECT plan_id, user_id, title, description, start_date, end_date, is_custom, created_at
      FROM study_plans
      WHERE user_id = $1
      ORDER BY start_date
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get plan by ID
  async getById(planId) {
    const query = `
      SELECT plan_id, user_id, title, description, start_date, end_date, is_custom, created_at
      FROM study_plans
      WHERE plan_id = $1
    `;

    const result = await db.query(query, [planId]);
    return result.rows[0];
  },

  // Update plan
  async update(planId, title, description, startDate, endDate) {
    const query = `
      UPDATE study_plans
      SET title = $2, description = $3, start_date = $4, end_date = $5
      WHERE plan_id = $1
      RETURNING plan_id, user_id, title, description, start_date, end_date, is_custom, created_at
    `;

    const values = [planId, title, description, startDate, endDate];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Delete plan
  async delete(planId) {
    const query = `
      DELETE FROM study_plans
      WHERE plan_id = $1
      RETURNING plan_id
    `;

    const result = await db.query(query, [planId]);
    return result.rows[0];
  },

  // Add activity to plan
  async addActivity(
    planId,
    subtopicId,
    title,
    description,
    duration,
    scheduledDate,
  ) {
    const query = `
      INSERT INTO plan_activities (plan_id, subtopic_id, title, description, duration, scheduled_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING activity_id, plan_id, subtopic_id, title, description, duration, scheduled_date, is_completed, created_at
    `;

    const values = [
      planId,
      subtopicId,
      title,
      description,
      duration,
      scheduledDate,
    ];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get plan activities
  async getPlanActivities(planId) {
    const query = `
      SELECT a.activity_id, a.plan_id, a.subtopic_id, a.title, a.description, 
             a.duration, a.scheduled_date, a.is_completed, a.created_at,
             s.title as subtopic_title, t.title as topic_title
      FROM plan_activities a
      LEFT JOIN subtopics s ON a.subtopic_id = s.subtopic_id
      LEFT JOIN topics t ON s.topic_id = t.topic_id
      WHERE a.plan_id = $1
      ORDER BY a.scheduled_date, a.created_at
    `;

    const result = await db.query(query, [planId]);
    return result.rows;
  },

  // Update activity completion status
  async updateActivityStatus(activityId, isCompleted) {
    const query = `
      UPDATE plan_activities
      SET is_completed = $2
      WHERE activity_id = $1
      RETURNING activity_id, plan_id, subtopic_id, title, description, duration, scheduled_date, is_completed, created_at
    `;

    const result = await db.query(query, [activityId, isCompleted]);
    return result.rows[0];
  },

  // Delete activity
  async deleteActivity(activityId) {
    const query = `
      DELETE FROM plan_activities
      WHERE activity_id = $1
      RETURNING activity_id
    `;

    const result = await db.query(query, [activityId]);
    return result.rows[0];
  },
};

module.exports = studyPlanModel;
