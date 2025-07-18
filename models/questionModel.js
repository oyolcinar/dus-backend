const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const questionModel = {
  // Create a new question
  async create(
    testId,
    questionText,
    options,
    correctAnswer,
    explanation = null,
  ) {
    try {
      // Start a transaction by using a single batch operation
      // First insert the question
      const { data, error } = await supabase
        .from('test_questions')
        .insert({
          test_id: testId,
          question_text: questionText,
          options: options, // This should be in format {"A": "answer1", "B": "answer2", ...}
          correct_answer: correctAnswer,
          explanation: explanation,
        })
        .select(
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
        )
        .single();

      if (error) throw error;

      // Note: We don't need to manually update the question_count anymore
      // The database trigger we created will handle this automatically

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
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
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
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
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
  async update(
    questionId,
    questionText,
    options,
    correctAnswer,
    explanation = null,
  ) {
    try {
      const updateData = {};

      if (questionText !== undefined) updateData.question_text = questionText;
      if (options !== undefined) updateData.options = options; // Should be in format {"A": "answer1", "B": "answer2", ...}
      if (correctAnswer !== undefined)
        updateData.correct_answer = correctAnswer;
      if (explanation !== undefined) updateData.explanation = explanation;

      const { data, error } = await supabase
        .from('test_questions')
        .update(updateData)
        .eq('question_id', questionId)
        .select(
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
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
        .select('question_id, test_id') // Include test_id to know which test's count to decrement
        .single();

      if (error) throw error;

      // Note: We don't need to manually update the question_count anymore
      // The database trigger we created will handle this automatically

      return data;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },

  // Batch create questions (useful for importing questions)
  async createBatch(questions) {
    try {
      const formattedQuestions = questions.map((q) => ({
        test_id: q.testId,
        question_text: q.questionText,
        options: q.options, // Should be in format {"A": "answer1", "B": "answer2", ...}
        correct_answer: q.correctAnswer,
        explanation: q.explanation || null,
      }));

      const { data, error } = await supabase
        .from('test_questions')
        .insert(formattedQuestions)
        .select(
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
        );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error batch creating questions:', error);
      throw error;
    }
  },

  // Get questions with pagination
  async getByTestIdWithPagination(testId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('test_questions')
        .select(
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
          { count: 'exact' },
        )
        .eq('test_id', testId)
        .order('question_id', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error('Error getting questions with pagination:', error);
      throw error;
    }
  },

  // Update question explanation only
  async updateExplanation(questionId, explanation) {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .update({ explanation })
        .eq('question_id', questionId)
        .select(
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
        )
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating question explanation:', error);
      throw error;
    }
  },
};

module.exports = questionModel;
