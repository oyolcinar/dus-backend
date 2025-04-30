const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const subtopicModel = {
  // Create a new subtopic
  async create(topicId, title, description, orderIndex) {
    try {
      const { data, error } = await supabase
        .from('subtopics')
        .insert({
          topic_id: topicId,
          title,
          description,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating subtopic:', error);
      throw error;
    }
  },

  // Get subtopics by topic ID
  async getByTopicId(topicId) {
    try {
      const { data, error } = await supabase
        .from('subtopics')
        .select('*')
        .eq('topic_id', topicId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(
        `Error retrieving subtopics for topic ID ${topicId}:`,
        error,
      );
      throw error;
    }
  },

  // Get subtopic by ID
  async getById(subtopicId) {
    try {
      const { data, error } = await supabase
        .from('subtopics')
        .select('*')
        .eq('subtopic_id', subtopicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error(`Error retrieving subtopic ID ${subtopicId}:`, error);
      throw error;
    }
  },

  // Update subtopic
  async update(subtopicId, title, description, orderIndex) {
    try {
      // Prepare the update object with only defined values
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (orderIndex !== undefined) updateData.order_index = orderIndex;

      // Skip update if no fields to update
      if (Object.keys(updateData).length === 0) {
        const { data } = await supabase
          .from('subtopics')
          .select('*')
          .eq('subtopic_id', subtopicId)
          .single();
        return data;
      }

      const { data, error } = await supabase
        .from('subtopics')
        .update(updateData)
        .eq('subtopic_id', subtopicId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating subtopic ID ${subtopicId}:`, error);
      throw error;
    }
  },

  // Delete subtopic
  async delete(subtopicId) {
    try {
      // First check if the subtopic is referenced in user progress data
      const { data: progressData, error: checkProgressError } = await supabase
        .from('user_study_progress')
        .select('progress_id')
        .eq('subtopic_id', subtopicId)
        .limit(1);

      if (checkProgressError) throw checkProgressError;

      if (progressData && progressData.length > 0) {
        // If there's progress data, we might want to be cautious
        // For now, let's delete the progress data first
        await supabase
          .from('user_study_progress')
          .delete()
          .eq('subtopic_id', subtopicId);
      }

      // Also check for plan activities referencing this subtopic
      const { data: planActivities, error: checkActivitiesError } =
        await supabase
          .from('plan_activities')
          .select('activity_id')
          .eq('subtopic_id', subtopicId)
          .limit(1);

      if (checkActivitiesError) throw checkActivitiesError;

      if (planActivities && planActivities.length > 0) {
        // Delete associated plan activities
        await supabase
          .from('plan_activities')
          .delete()
          .eq('subtopic_id', subtopicId);
      }

      // Finally delete the subtopic
      const { data, error } = await supabase
        .from('subtopics')
        .delete()
        .eq('subtopic_id', subtopicId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { subtopic_id: subtopicId };
    } catch (error) {
      console.error(`Error deleting subtopic ID ${subtopicId}:`, error);
      throw error;
    }
  },

  // Reorder subtopics for a topic
  async reorder(topicId, subtopicOrders) {
    try {
      if (!Array.isArray(subtopicOrders) || subtopicOrders.length === 0) {
        throw new Error('Subtopic order data must be a non-empty array');
      }

      // Update each subtopic's order index
      const updates = subtopicOrders.map(({ subtopicId, orderIndex }) => {
        return supabase
          .from('subtopics')
          .update({ order_index: orderIndex })
          .eq('subtopic_id', subtopicId)
          .eq('topic_id', topicId);
      });

      await Promise.all(updates);

      // Return updated subtopics in order
      const { data, error } = await supabase
        .from('subtopics')
        .select('*')
        .eq('topic_id', topicId)
        .order('order_index');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error reordering subtopics for topic ID ${topicId}:`,
        error,
      );
      throw error;
    }
  },

  // Get user progress for a specific subtopic
  async getUserProgress(userId, subtopicId) {
    try {
      const { data, error } = await supabase
        .from('user_study_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('subtopic_id', subtopicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error(
        `Error retrieving user progress for subtopic ID ${subtopicId}:`,
        error,
      );
      throw error;
    }
  },
};

module.exports = subtopicModel;
