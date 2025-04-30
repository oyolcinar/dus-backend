const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const questionModel = {
  // Create a new question
  async create(testId, questionText, options, correctAnswer) {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .insert({
          test_id: testId,
          question_text: questionText,
          options: options,
          correct_answer: correctAnswer,
        })
        .select(
          'question_id, test_id, question_text, options, correct_answer, created_at',
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  },

  // Get questions by test ID
  async getByTestId(testId) {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select(
          'question_id, test_id, question_text, options, correct_answer, created_at',
        )
        .eq('test_id', testId)
        .order('question_id', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting questions by test ID:', error);
      throw error;
    }
  },

  // Get question by ID
  async getById(questionId) {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select(
          'question_id, test_id, question_text, options, correct_answer, created_at',
        )
        .eq('question_id', questionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No question found
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting question by ID:', error);
      throw error;
    }
  },

  // Update question
  async update(questionId, questionText, options, correctAnswer) {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .update({
          question_text: questionText,
          options: options,
          correct_answer: correctAnswer,
        })
        .eq('question_id', questionId)
        .select(
          'question_id, test_id, question_text, options, correct_answer, created_at',
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  },

  // Delete question
  async delete(questionId) {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .delete()
        .eq('question_id', questionId)
        .select('question_id')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },
};

module.exports = questionModel;
