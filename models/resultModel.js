const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const resultModel = {
  // Create a new test result
  async create(userId, testId, score, timeTaken) {
    try {
      const { data, error } = await supabase
        .from('user_test_results')
        .insert({
          user_id: userId,
          test_id: testId,
          score: score,
          time_taken: timeTaken,
        })
        .select('result_id, user_id, test_id, score, time_taken, date_taken')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating test result:', error);
      throw error;
    }
  },

  // Get results by user ID
  async getByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_test_results')
        .select(
          `
          result_id,
          user_id,
          test_id,
          score,
          time_taken,
          date_taken,
          tests (
            title,
            difficulty_level
          )
        `,
        )
        .eq('user_id', userId)
        .order('date_taken', { ascending: false });

      if (error) throw error;

      // Transform the nested data to match the format of the original model
      return data.map((result) => ({
        result_id: result.result_id,
        user_id: result.user_id,
        test_id: result.test_id,
        score: result.score,
        time_taken: result.time_taken,
        date_taken: result.date_taken,
        test_title: result.tests?.title,
        difficulty_level: result.tests?.difficulty_level,
      }));
    } catch (error) {
      console.error('Error getting results by user ID:', error);
      throw error;
    }
  },

  // Get result by ID
  async getById(resultId) {
    try {
      const { data, error } = await supabase
        .from('user_test_results')
        .select(
          `
          result_id,
          user_id,
          test_id,
          score,
          time_taken,
          date_taken,
          tests (
            title,
            difficulty_level
          )
        `,
        )
        .eq('result_id', resultId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No result found
        }
        throw error;
      }

      // Transform to match the original model format
      return data
        ? {
            result_id: data.result_id,
            user_id: data.user_id,
            test_id: data.test_id,
            score: data.score,
            time_taken: data.time_taken,
            date_taken: data.date_taken,
            test_title: data.tests?.title,
            difficulty_level: data.tests?.difficulty_level,
          }
        : null;
    } catch (error) {
      console.error('Error getting result by ID:', error);
      throw error;
    }
  },

  // Get average score for a test
  async getAverageScoreByTest(testId) {
    try {
      // Supabase doesn't directly support aggregation in the client API
      // We need to use a raw SQL query or calculate this on the client side

      // First, get all results for the test
      const { data, error } = await supabase
        .from('user_test_results')
        .select('score')
        .eq('test_id', testId);

      if (error) throw error;

      // Calculate average and count on the client side
      const attemptCount = data.length;
      const totalScore = data.reduce(
        (sum, item) => sum + Number(item.score),
        0,
      );
      const averageScore = attemptCount > 0 ? totalScore / attemptCount : 0;

      return {
        average_score: averageScore,
        attempt_count: attemptCount,
      };
    } catch (error) {
      console.error('Error getting average score by test ID:', error);
      throw error;
    }
  },
};

module.exports = resultModel;
