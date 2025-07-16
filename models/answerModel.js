const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const answerModel = {
  // Create a new user answer
  async create(
    resultId,
    questionId,
    userAnswer,
    isCorrect,
    answerDefinition = null,
  ) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .insert({
          result_id: resultId,
          question_id: questionId,
          user_answer: userAnswer,
          is_correct: isCorrect,
          answer_definition: answerDefinition,
        })
        .select(
          'answer_id, result_id, question_id, user_answer, is_correct, answer_definition, created_at',
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
        answer_definition: answer.answerDefinition || null,
      }));

      const { data, error } = await supabase
        .from('user_answers')
        .insert(formattedAnswers)
        .select(
          'answer_id, result_id, question_id, user_answer, is_correct, answer_definition, created_at',
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
          answer_definition,
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
        answer_definition: answer.answer_definition,
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

  // Get answers by question ID (useful for analytics)
  async getByQuestionId(questionId) {
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
          answer_definition,
          created_at,
          user_test_results (
            user_id,
            tests (
              title,
              course_id
            )
          )
        `,
        )
        .eq('question_id', questionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting answers by question ID:', error);
      throw error;
    }
  },

  // Get incorrect answers with explanations for a user
  async getIncorrectAnswersWithExplanations(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select(
          `
          answer_id,
          user_answer,
          is_correct,
          answer_definition,
          created_at,
          test_questions (
            question_id,
            question_text,
            correct_answer,
            options
          ),
          user_test_results!inner (
            user_id,
            test_id,
            tests (
              title,
              course_id,
              courses (
                title
              )
            )
          )
        `,
        )
        .eq('is_correct', false)
        .eq('user_test_results.user_id', userId)
        .not('answer_definition', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((answer) => ({
        answer_id: answer.answer_id,
        user_answer: answer.user_answer,
        correct_answer: answer.test_questions?.correct_answer,
        explanation: answer.answer_definition,
        question_text: answer.test_questions?.question_text,
        question_options: answer.test_questions?.options,
        test_title: answer.user_test_results?.tests?.title,
        course_title: answer.user_test_results?.tests?.courses?.title,
        answered_at: answer.created_at,
      }));
    } catch (error) {
      console.error(
        'Error getting incorrect answers with explanations:',
        error,
      );
      throw error;
    }
  },

  // Update answer definition for an existing answer
  async updateAnswerDefinition(answerId, answerDefinition) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .update({ answer_definition: answerDefinition })
        .eq('answer_id', answerId)
        .select(
          'answer_id, result_id, question_id, user_answer, is_correct, answer_definition, created_at',
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating answer definition:', error);
      throw error;
    }
  },

  // Get answers with explanations by user and date range
  async getAnswersWithExplanationsByDateRange(userId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select(
          `
          answer_id,
          user_answer,
          is_correct,
          answer_definition,
          created_at,
          test_questions (
            question_text,
            correct_answer,
            options
          ),
          user_test_results!inner (
            user_id,
            test_id,
            tests (
              title,
              course_id,
              courses (
                title
              )
            )
          )
        `,
        )
        .eq('user_test_results.user_id', userId)
        .not('answer_definition', 'is', null)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        'Error getting answers with explanations by date range:',
        error,
      );
      throw error;
    }
  },

  // Get statistics about answers with explanations
  async getAnswerExplanationStats(userId) {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select(
          `
          answer_id,
          is_correct,
          answer_definition,
          user_test_results!inner (
            user_id
          )
        `,
        )
        .eq('user_test_results.user_id', userId);

      if (error) throw error;

      const stats = {
        totalAnswers: data.length,
        totalWithExplanations: data.filter((answer) => answer.answer_definition)
          .length,
        correctAnswersWithExplanations: data.filter(
          (answer) => answer.is_correct && answer.answer_definition,
        ).length,
        incorrectAnswersWithExplanations: data.filter(
          (answer) => !answer.is_correct && answer.answer_definition,
        ).length,
      };

      stats.explanationCoveragePercentage =
        stats.totalAnswers > 0
          ? (stats.totalWithExplanations / stats.totalAnswers) * 100
          : 0;

      return stats;
    } catch (error) {
      console.error('Error getting answer explanation stats:', error);
      throw error;
    }
  },

  // Batch update answer definitions for multiple answers
  async batchUpdateAnswerDefinitions(updates) {
    try {
      // Since Supabase doesn't support batch updates directly,
      // we'll use Promise.all to update multiple records
      const updatePromises = updates.map((update) =>
        supabase
          .from('user_answers')
          .update({ answer_definition: update.answerDefinition })
          .eq('answer_id', update.answerId)
          .select('answer_id, answer_definition')
          .single(),
      );

      const results = await Promise.all(updatePromises);

      // Check for any errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        throw new Error(
          `Batch update failed: ${errors
            .map((e) => e.error.message)
            .join(', ')}`,
        );
      }

      return results.map((result) => result.data);
    } catch (error) {
      console.error('Error batch updating answer definitions:', error);
      throw error;
    }
  },
};

module.exports = answerModel;
