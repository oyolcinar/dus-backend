const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const answerModel = {
  // Create a new user answer
  async create(resultId, questionId, userAnswer, isCorrect) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .insert({
          result_id: resultId,
          question_id: questionId,
          user_answer: userAnswer,
          is_correct: isCorrect,
        })
        .select(
          'answer_id, result_id, question_id, user_answer, is_correct, created_at',
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  },

  // Create multiple user answers in a transaction
  async createBatch(answers) {
    try {
      // Supabase doesn't directly support transactions in the client
      // But we can use the upsert functionality for batch inserts
      const formattedAnswers = answers.map((answer) => ({
        result_id: answer.resultId,
        question_id: answer.questionId,
        user_answer: answer.userAnswer,
        is_correct: answer.isCorrect,
      }));

      const { data, error } = await supabase
        .from('user_answers')
        .insert(formattedAnswers)
        .select(
          'answer_id, result_id, question_id, user_answer, is_correct, created_at',
        );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error batch creating answers:', error);
      throw error;
    }
  },

  // Get answers by result ID
  async getByResultId(resultId) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select(
          `
          answer_id,
          result_id,
          question_id,
          user_answer,
          is_correct,
          created_at,
          test_questions (
            question_text,
            options,
            correct_answer
          )
        `,
        )
        .eq('result_id', resultId)
        .order('answer_id', { ascending: true });

      if (error) throw error;

      // Transform the nested data to match the format of the original model
      return data.map((answer) => ({
        answer_id: answer.answer_id,
        result_id: answer.result_id,
        question_id: answer.question_id,
        user_answer: answer.user_answer,
        is_correct: answer.is_correct,
        created_at: answer.created_at,
        question_text: answer.test_questions?.question_text,
        options: answer.test_questions?.options,
        correct_answer: answer.test_questions?.correct_answer,
      }));
    } catch (error) {
      console.error('Error getting answers by result ID:', error);
      throw error;
    }
  },
};

module.exports = answerModel;
