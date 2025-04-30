const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const topicModel = {
  // Create a new topic
  async create(courseId, title, description, orderIndex) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          course_id: courseId,
          title,
          description,
          order_index: orderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  },

  // Get all topics
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('order_index');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error retrieving all topics:', error);
      throw error;
    }
  },

  // Get topics by course ID
  async getByCourseId(courseId) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(
        `Error retrieving topics for course ID ${courseId}:`,
        error,
      );
      throw error;
    }
  },

  // Get topic by ID
  async getById(topicId) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('topic_id', topicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error(`Error retrieving topic ID ${topicId}:`, error);
      throw error;
    }
  },

  // Update topic
  async update(topicId, title, description, orderIndex) {
    try {
      // Prepare the update object with only defined values
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (orderIndex !== undefined) updateData.order_index = orderIndex;

      // Skip update if no fields to update
      if (Object.keys(updateData).length === 0) {
        const { data } = await supabase
          .from('topics')
          .select('*')
          .eq('topic_id', topicId)
          .single();
        return data;
      }

      const { data, error } = await supabase
        .from('topics')
        .update(updateData)
        .eq('topic_id', topicId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating topic ID ${topicId}:`, error);
      throw error;
    }
  },

  // Delete topic
  async delete(topicId) {
    try {
      // First check if topic has any subtopics
      const { data: subtopics, error: checkError } = await supabase
        .from('subtopics')
        .select('subtopic_id')
        .eq('topic_id', topicId);

      if (checkError) throw checkError;

      if (subtopics && subtopics.length > 0) {
        throw new Error(
          `Cannot delete topic ID ${topicId} because it has ${subtopics.length} subtopics. Delete them first.`,
        );
      }

      const { data, error } = await supabase
        .from('topics')
        .delete()
        .eq('topic_id', topicId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { topic_id: topicId };
    } catch (error) {
      console.error(`Error deleting topic ID ${topicId}:`, error);
      throw error;
    }
  },

  // Reorder topics for a course
  async reorder(courseId, topicOrders) {
    try {
      if (!Array.isArray(topicOrders) || topicOrders.length === 0) {
        throw new Error('Topic order data must be a non-empty array');
      }

      // Update each topic's order index
      const updates = topicOrders.map(({ topicId, orderIndex }) => {
        return supabase
          .from('topics')
          .update({ order_index: orderIndex })
          .eq('topic_id', topicId)
          .eq('course_id', courseId);
      });

      await Promise.all(updates);

      // Return updated topics in order
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error reordering topics for course ID ${courseId}:`,
        error,
      );
      throw error;
    }
  },
};

module.exports = topicModel;
