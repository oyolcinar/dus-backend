const db = require('../config/db'); // Keeping for backward compatibility
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');
// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const testModel = {
  // Create a new test
  async create(title, description, courseId, difficultyLevel, timeLimit = 30) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .insert({
          title,
          description,
          course_id: courseId,
          difficulty_level: difficultyLevel,
          time_limit: timeLimit,
          // question_count will default to 0 as set in the database
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating test:', error);
      throw error;
    }
  },

  // Get all tests
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          courses (
            course_id,
            title,
            course_type
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting all tests:', error);
      throw error;
    }
  },

  // Get tests by course ID
  async getByCourseId(courseId) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          courses (
            course_id,
            title,
            course_type
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting tests by course ID:', error);
      throw error;
    }
  },

  // Get tests by course type
  async getByCourseType(courseType) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          courses!inner (
            course_id,
            title,
            course_type
          )
        `)
        .eq('courses.course_type', courseType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting tests by course type:', error);
      throw error;
    }
  },

  // Get test by ID
  async getById(testId) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          courses (
            course_id,
            title,
            course_type
          )
        `)
        .eq('test_id', testId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is the "no rows returned" error
      return data || null;
    } catch (error) {
      console.error('Error getting test by ID:', error);
      throw error;
    }
  },

  // Update test
  async update(testId, title, description, courseId, difficultyLevel, timeLimit) {
    try {
      // Create update object with only the fields that are provided
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (courseId !== undefined) updateData.course_id = courseId;
      if (difficultyLevel !== undefined)
        updateData.difficulty_level = difficultyLevel;
      if (timeLimit !== undefined) updateData.time_limit = timeLimit;

      // Only proceed with update if there are fields to update
      if (Object.keys(updateData).length === 0) {
        // If no fields to update, fetch and return the current test
        return this.getById(testId);
      }

      const { data, error } = await supabase
        .from('tests')
        .update(updateData)
        .eq('test_id', testId)
        .select(`
          *,
          courses (
            course_id,
            title,
            course_type
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating test:', error);
      throw error;
    }
  },

  // Get test with questions
  async getWithQuestions(testId) {
    try {
      // First, get the test
      const test = await this.getById(testId);
      if (!test) return null;

      // Then get questions for this test
      const { data: questions, error } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_id', { ascending: true });

      if (error) throw error;

      // Return combined object
      return {
        ...test,
        questions: questions || [],
      };
    } catch (error) {
      console.error('Error getting test with questions:', error);
      throw error;
    }
  },

  // Get test statistics
  async getTestStats(testId) {
    try {
      // Get question count
      const { data: questions, error: questionsError } = await supabase
        .from('test_questions')
        .select('question_id')
        .eq('test_id', testId);

      if (questionsError) throw questionsError;

      // Get total attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('user_test_results')
        .select('result_id, score')
        .eq('test_id', testId);

      if (attemptsError) throw attemptsError;

      // Calculate average score
      const totalAttempts = attempts.length;
      const averageScore = totalAttempts > 0 
        ? attempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) / totalAttempts
        : 0;

      return {
        testId,
        questionCount: questions.length,
        totalAttempts,
        averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      console.error('Error getting test statistics:', error);
      throw error;
    }
  },

  // Check if user has answered a test before
  async hasUserTakenTest(userId, testId) {
    try {
      const { data, error } = await supabase
        .from('user_test_results')
        .select('result_id, score, date_taken')
        .eq('user_id', userId)
        .eq('test_id', testId)
        .order('date_taken', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      return {
        hasTaken: data.length > 0,
        lastAttempt: data[0] || null,
      };
    } catch (error) {
      console.error('Error checking if user has taken test:', error);
      throw error;
    }
  },

  // Delete test
  async delete(testId) {
    try {
      // Note: Deleting a test should cascade to delete associated questions
      // This should be handled at the database level with a CASCADE constraint
      const { data, error } = await supabase
        .from('tests')
        .delete()
        .eq('test_id', testId)
        .select('test_id')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting test:', error);
      throw error;
    }
  },
};

module.exports = testModel;
