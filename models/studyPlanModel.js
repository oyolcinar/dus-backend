const db = require('../config/db'); // Keeping for backward compatibility
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const studyPlanModel = {
  // Create a new study plan
  async create(userId, title, description, startDate, endDate, isCustom) {
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: userId,
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          is_custom: isCustom,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating study plan:', error);
      throw error;
    }
  },

  // Get user's study plans
  async getUserPlans(userId) {
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', userId)
        .order('start_date');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user plans:', error);
      throw error;
    }
  },

  // Get plan by ID
  async getById(planId) {
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('plan_id', planId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is the "no rows returned" error
      return data || null;
    } catch (error) {
      console.error('Error getting study plan by ID:', error);
      throw error;
    }
  },

  // Update plan
  async update(planId, title, description, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .update({
          title,
          description,
          start_date: startDate,
          end_date: endDate,
        })
        .eq('plan_id', planId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating study plan:', error);
      throw error;
    }
  },

  // Delete plan
  async delete(planId) {
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .delete()
        .eq('plan_id', planId)
        .select('plan_id')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting study plan:', error);
      throw error;
    }
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
    try {
      const { data, error } = await supabase
        .from('plan_activities')
        .insert({
          plan_id: planId,
          subtopic_id: subtopicId,
          title,
          description,
          duration,
          scheduled_date: scheduledDate,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding plan activity:', error);
      throw error;
    }
  },

  // Get plan activities
  async getPlanActivities(planId) {
    try {
      const { data, error } = await supabase
        .from('plan_activities')
        .select(
          `
          *,
          subtopics(title, topic_id, topics(title))
        `,
        )
        .eq('plan_id', planId)
        .order('scheduled_date')
        .order('created_at');

      if (error) throw error;

      // Transform the data to match the expected format
      const formattedData = data.map((activity) => ({
        activity_id: activity.activity_id,
        plan_id: activity.plan_id,
        subtopic_id: activity.subtopic_id,
        title: activity.title,
        description: activity.description,
        duration: activity.duration,
        scheduled_date: activity.scheduled_date,
        is_completed: activity.is_completed,
        created_at: activity.created_at,
        subtopic_title: activity.subtopics?.title || null,
        topic_title: activity.subtopics?.topics?.title || null,
      }));

      return formattedData;
    } catch (error) {
      console.error('Error getting plan activities:', error);
      throw error;
    }
  },

  // Update activity completion status
  async updateActivityStatus(activityId, isCompleted) {
    try {
      const { data, error } = await supabase
        .from('plan_activities')
        .update({ is_completed: isCompleted })
        .eq('activity_id', activityId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating activity status:', error);
      throw error;
    }
  },

  // Delete activity
  async deleteActivity(activityId) {
    try {
      const { data, error } = await supabase
        .from('plan_activities')
        .delete()
        .eq('activity_id', activityId)
        .select('activity_id')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  },
};

module.exports = studyPlanModel;
