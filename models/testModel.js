const db = require('../config/db'); // Keeping for backward compatibility
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const testModel = {
  // Create a new test
  async create(title, description, difficultyLevel) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .insert({
          title,
          description,
          difficulty_level: difficultyLevel,
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
  async update(testId, title, description, difficultyLevel) {
    try {
      const { data, error } = await supabase
        .from('tests')
        .update({
          title,
          description,
          difficulty_level: difficultyLevel,
        })
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

  // Delete test
  async delete(testId) {
    try {
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
