const db = require('../config/db'); // Keeping for backward compatibility
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');
// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const testModel = {
  // Create a new test
  async create(title, description, difficultyLevel, timeLimit = 30) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .insert({
          title,
          description,
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
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting all tests:', error);
      throw error;
    }
  },

  // Get test by ID
  async getById(testId) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
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
  async update(testId, title, description, difficultyLevel, timeLimit) {
    try {
      // Create update object with only the fields that are provided
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
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
        .select('*')
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
