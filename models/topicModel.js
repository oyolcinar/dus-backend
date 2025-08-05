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

  // Get topic with course information
  async getByIdWithCourse(topicId) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select(
          `
          *,
          courses(course_id, title, description, course_type)
        `,
        )
        .eq('topic_id', topicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error(`Error retrieving topic with course ID ${topicId}:`, error);
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

  // Get topics with subtopic count
  async getTopicsWithSubtopicCount(courseId) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select(
          `
          *,
          subtopics(count)
        `,
        )
        .eq('course_id', courseId)
        .order('order_index');

      if (error) throw error;

      // Transform the data to include subtopic count
      const topics = (data || []).map((topic) => ({
        ...topic,
        subtopic_count: topic.subtopics?.[0]?.count || 0,
      }));

      return topics;
    } catch (error) {
      console.error(
        `Error retrieving topics with subtopic count for course ID ${courseId}:`,
        error,
      );
      throw error;
    }
  },

  // Get topic statistics (content-related, not study-related)
  async getTopicStats(topicId) {
    try {
      // Get subtopic count
      const { data: subtopics, error: subtopicsError } = await supabase
        .from('subtopics')
        .select('subtopic_id')
        .eq('topic_id', topicId);

      if (subtopicsError) throw subtopicsError;

      // Get topic with course info
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select(
          `
          *,
          courses(title, course_type)
        `,
        )
        .eq('topic_id', topicId)
        .single();

      if (topicError) throw topicError;

      return {
        topicId,
        topicTitle: topic.title,
        courseTitle: topic.courses?.title,
        courseType: topic.courses?.course_type,
        subtopicCount: (subtopics || []).length,
        orderIndex: topic.order_index,
      };
    } catch (error) {
      console.error(
        `Error getting topic statistics for topic ${topicId}:`,
        error,
      );
      throw error;
    }
  },

  // Search topics by title
  async searchByTitle(searchTerm, courseId = null, limit = 50) {
    try {
      let query = supabase
        .from('topics')
        .select(
          `
          *,
          courses(title, course_type)
        `,
        )
        .ilike('title', `%${searchTerm}%`)
        .order('title')
        .limit(limit);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching topics by title:', error);
      throw error;
    }
  },

  // Get the next order index for a course
  async getNextOrderIndex(courseId) {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('order_index')
        .eq('course_id', courseId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return (data?.order_index || 0) + 1;
    } catch (error) {
      console.error(
        `Error getting next order index for course ${courseId}:`,
        error,
      );
      throw error;
    }
  },

  // Bulk create topics
  async bulkCreate(courseId, topics) {
    try {
      if (!Array.isArray(topics) || topics.length === 0) {
        throw new Error('Topics must be a non-empty array');
      }

      // Get the starting order index
      let startOrderIndex = await this.getNextOrderIndex(courseId);

      // Prepare topics with order indices
      const topicsWithOrder = topics.map((topic, index) => ({
        course_id: courseId,
        title: topic.title,
        description: topic.description || null,
        order_index: startOrderIndex + index,
      }));

      const { data, error } = await supabase
        .from('topics')
        .insert(topicsWithOrder)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error bulk creating topics for course ${courseId}:`,
        error,
      );
      throw error;
    }
  },

  // Get topics by course with pagination
  async getByCourseIdPaginated(courseId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('topics')
        .select('*', { count: 'exact' })
        .eq('course_id', courseId)
        .order('order_index')
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        topics: data || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > offset + limit,
      };
    } catch (error) {
      console.error(
        `Error retrieving paginated topics for course ID ${courseId}:`,
        error,
      );
      throw error;
    }
  },
};

module.exports = topicModel;
