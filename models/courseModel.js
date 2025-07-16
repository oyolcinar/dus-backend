const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const courseModel = {
  // Create a new course
  async create(title, description, imageUrl, courseType = 'temel_dersler') {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title,
          description,
          image_url: imageUrl,
          course_type: courseType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  },

  // Get all courses
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('course_type', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error retrieving all courses:', error);
      throw error;
    }
  },

  // Get courses by type
  async getByType(courseType) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('course_type', courseType)
        .order('title');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error retrieving courses by type (${courseType}):`, error);
      throw error;
    }
  },

  // Get courses by subscription type
  async getBySubscriptionType(subscriptionType) {
    try {
      // For now, we'll return all courses since subscription filtering
      // may require a more complex query or join
      // This should be implemented based on your subscription model
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('course_type', { ascending: true })
        .order('title');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error retrieving courses by subscription type (${subscriptionType}):`,
        error,
      );
      throw error;
    }
  },

  // Get course by ID
  async getById(courseId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error(`Error retrieving course ID ${courseId}:`, error);
      throw error;
    }
  },

  // Update course
  async update(courseId, title, description, imageUrl, courseType) {
    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.image_url = imageUrl;
      if (courseType !== undefined) updateData.course_type = courseType;

      const { data, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating course ID ${courseId}:`, error);
      throw error;
    }
  },

  // Delete course
  async delete(courseId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .delete()
        .eq('course_id', courseId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { course_id: courseId };
    } catch (error) {
      console.error(`Error deleting course ID ${courseId}:`, error);
      throw error;
    }
  },

  // Get user's progress for a course
  async getUserProgress(userId, courseId) {
    try {
      // First we need to get all topics for this course
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('topic_id, title')
        .eq('course_id', courseId)
        .order('order_index');

      if (topicsError) throw topicsError;

      // Get all subtopics for these topics
      let totalSubtopics = 0;
      let completedSubtopics = 0;
      let topicsProgress = [];

      for (const topic of topics) {
        // Get subtopics for this topic
        const { data: subtopics, error: subtopicsError } = await supabase
          .from('subtopics')
          .select('subtopic_id')
          .eq('topic_id', topic.topic_id);

        if (subtopicsError) throw subtopicsError;

        const topicSubtopicCount = subtopics.length;
        totalSubtopics += topicSubtopicCount;

        // Get user's progress for these subtopics
        let topicCompletedCount = 0;
        if (topicSubtopicCount > 0) {
          // Get the completed subtopics for this topic
          const subtopicIds = subtopics.map((s) => s.subtopic_id);

          const { data: userProgress, error: progressError } = await supabase
            .from('user_study_progress')
            .select('subtopic_id')
            .eq('user_id', userId)
            .in('subtopic_id', subtopicIds)
            .gte('mastery_level', 1); // Consider mastery level 1 or greater as "completed"

          if (progressError) throw progressError;

          topicCompletedCount = userProgress?.length || 0;
          completedSubtopics += topicCompletedCount;
        }

        // Calculate completion percentage for this topic
        const topicPercentage =
          topicSubtopicCount > 0
            ? Math.round((topicCompletedCount / topicSubtopicCount) * 100)
            : 0;

        topicsProgress.push({
          topic_id: topic.topic_id,
          title: topic.title,
          completed: topicCompletedCount,
          total: topicSubtopicCount,
          percentage: topicPercentage,
        });
      }

      // Get the last time the user accessed this course (latest study session)
      const { data: lastSession, error: sessionError } = await supabase
        .from('study_sessions')
        .select('end_time')
        .eq('user_id', userId)
        .order('end_time', { ascending: false })
        .limit(1)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

      return {
        courseId,
        userId,
        completedSubtopics,
        totalSubtopics,
        lastAccessed: lastSession?.end_time || null,
        topicsProgress,
      };
    } catch (error) {
      console.error(
        `Error getting user progress for course ${courseId}, user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Mark a subtopic as completed
  async markSubtopicCompleted(userId, subtopicId) {
    try {
      const now = new Date().toISOString();

      // First, check if there's already a progress record
      const { data: existingProgress, error: checkError } = await supabase
        .from('user_study_progress')
        .select('progress_id, mastery_level, repetition_count')
        .eq('user_id', userId)
        .eq('subtopic_id', subtopicId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      let result;

      if (existingProgress) {
        // Update existing progress
        const { data, error } = await supabase
          .from('user_study_progress')
          .update({
            mastery_level: Math.min(5, existingProgress.mastery_level + 1), // Increment mastery level (max 5)
            repetition_count: existingProgress.repetition_count + 1,
            last_studied_at: now,
          })
          .eq('progress_id', existingProgress.progress_id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new progress entry
        const { data, error } = await supabase
          .from('user_study_progress')
          .insert({
            user_id: userId,
            subtopic_id: subtopicId,
            mastery_level: 1, // Start with level 1
            repetition_count: 1,
            last_studied_at: now,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return {
        userId,
        subtopicId,
        masteryLevel: result.mastery_level,
        repetitionCount: result.repetition_count,
        completedAt: result.last_studied_at,
      };
    } catch (error) {
      console.error(
        `Error marking subtopic ${subtopicId} as completed for user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Get course statistics
  async getCourseStats(courseId) {
    try {
      // Get total tests for this course
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('test_id')
        .eq('course_id', courseId);

      if (testsError) throw testsError;

      // Get total questions for this course
      const testIds = tests.map(t => t.test_id);
      let totalQuestions = 0;
      
      if (testIds.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from('test_questions')
          .select('question_id')
          .in('test_id', testIds);

        if (questionsError) throw questionsError;
        totalQuestions = questions.length;
      }

      // Get total topics for this course
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('topic_id')
        .eq('course_id', courseId);

      if (topicsError) throw topicsError;

      return {
        courseId,
        totalTests: tests.length,
        totalQuestions,
        totalTopics: topics.length,
      };
    } catch (error) {
      console.error(`Error getting course statistics for course ${courseId}:`, error);
      throw error;
    }
  },
};

module.exports = courseModel;
