const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const userQuestionHistoryModel = {
  // Check if user has answered a specific question before
  async hasUserAnsweredQuestion(userId, questionId) {
    try {
      const { data, error } = await supabase
        .rpc('has_user_answered_question', {
          p_user_id: userId,
          p_question_id: questionId
        });

      if (error) throw error;
      
      // The function returns a table, so we get the first row
      const result = data[0];
      
      return {
        answered: result?.answered || false,
        lastAnswer: result?.last_answer || null,
        wasCorrect: result?.was_correct || null,
        answerDate: result?.answer_date || null,
        testTitle: result?.test_title || null,
        courseTitle: result?.course_title || null,
      };
    } catch (error) {
      console.error('Error checking if user answered question:', error);
      throw error;
    }
  },

  // Get user's question history for a specific test
  async getUserTestQuestionHistory(userId, testId) {
    try {
      const { data, error } = await supabase
        .from('user_question_history')
        .select('*')
        .eq('user_id', userId)
        .eq('test_id', testId)
        .order('answer_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user test question history:', error);
      throw error;
    }
  },

  // Get user's question history for a specific course
  async getUserCourseQuestionHistory(userId, courseId) {
    try {
      const { data, error } = await supabase
        .from('user_question_history')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('answer_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user course question history:', error);
      throw error;
    }
  },

  // Get user's complete question history
  async getUserQuestionHistory(userId, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('user_question_history')
        .select('*')
        .eq('user_id', userId)
        .order('answer_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user question history:', error);
      throw error;
    }
  },

  // Get user's course statistics
  async getUserCourseStats(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_course_stats', {
          p_user_id: userId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user course statistics:', error);
      throw error;
    }
  },

  // Get user's question statistics for a specific course
  async getUserCourseQuestionStats(userId, courseId) {
    try {
      const { data, error } = await supabase
        .from('user_question_history')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) throw error;

      // Calculate statistics
      const totalQuestions = data.length;
      const correctAnswers = data.filter(q => q.is_correct).length;
      const incorrectAnswers = totalQuestions - correctAnswers;
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      // Group by test
      const testStats = data.reduce((acc, question) => {
        const testId = question.test_id;
        if (!acc[testId]) {
          acc[testId] = {
            testId,
            testTitle: question.test_title,
            totalQuestions: 0,
            correctAnswers: 0,
            lastAttempt: null,
          };
        }
        acc[testId].totalQuestions++;
        if (question.is_correct) acc[testId].correctAnswers++;
        
        // Update last attempt date
        const answerDate = new Date(question.answer_date);
        if (!acc[testId].lastAttempt || answerDate > new Date(acc[testId].lastAttempt)) {
          acc[testId].lastAttempt = question.answer_date;
        }
        
        return acc;
      }, {});

      return {
        courseId,
        userId,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        accuracy: Math.round(accuracy * 100) / 100,
        testStats: Object.values(testStats),
      };
    } catch (error) {
      console.error('Error getting user course question statistics:', error);
      throw error;
    }
  },

  // Get user's recent incorrect answers for review
  async getUserIncorrectAnswers(userId, courseId = null, limit = 50) {
    try {
      let query = supabase
        .from('user_question_history')
        .select('*')
        .eq('user_id', userId)
        .eq('is_correct', false)
        .order('answer_date', { ascending: false })
        .limit(limit);

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user incorrect answers:', error);
      throw error;
    }
  },

  // Get user's question performance trends
  async getUserQuestionTrends(userId, courseId = null, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('user_question_history')
        .select('*')
        .eq('user_id', userId)
        .gte('answer_date', startDate.toISOString())
        .order('answer_date', { ascending: true });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by date
      const trendsByDate = data.reduce((acc, question) => {
        const date = question.answer_date.split('T')[0]; // Get date only
        if (!acc[date]) {
          acc[date] = {
            date,
            totalQuestions: 0,
            correctAnswers: 0,
            accuracy: 0,
          };
        }
        acc[date].totalQuestions++;
        if (question.is_correct) acc[date].correctAnswers++;
        acc[date].accuracy = (acc[date].correctAnswers / acc[date].totalQuestions) * 100;
        return acc;
      }, {});

      return Object.values(trendsByDate).map(trend => ({
        ...trend,
        accuracy: Math.round(trend.accuracy * 100) / 100,
      }));
    } catch (error) {
      console.error('Error getting user question trends:', error);
      throw error;
    }
  },

  // Get questions that user should review (frequently missed)
  async getQuestionsForReview(userId, courseId = null, limit = 20) {
    try {
      let query = supabase
        .from('user_question_history')
        .select('question_id, question_text, is_correct, answer_date')
        .eq('user_id', userId)
        .eq('is_correct', false)
        .order('answer_date', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by question and find frequently missed ones
      const questionStats = data.reduce((acc, answer) => {
        const questionId = answer.question_id;
        if (!acc[questionId]) {
          acc[questionId] = {
            questionId,
            questionText: answer.question_text,
            attempts: 0,
            incorrectAttempts: 0,
            lastIncorrectDate: null,
          };
        }
        acc[questionId].attempts++;
        acc[questionId].incorrectAttempts++;
        
        const answerDate = new Date(answer.answer_date);
        if (!acc[questionId].lastIncorrectDate || answerDate > new Date(acc[questionId].lastIncorrectDate)) {
          acc[questionId].lastIncorrectDate = answer.answer_date;
        }
        
        return acc;
      }, {});

      // Sort by frequency of incorrect answers and recency
      const reviewQuestions = Object.values(questionStats)
        .sort((a, b) => {
          if (a.incorrectAttempts === b.incorrectAttempts) {
            return new Date(b.lastIncorrectDate) - new Date(a.lastIncorrectDate);
          }
          return b.incorrectAttempts - a.incorrectAttempts;
        })
        .slice(0, limit);

      return reviewQuestions;
    } catch (error) {
      console.error('Error getting questions for review:', error);
      throw error;
    }
  },
};

module.exports = userQuestionHistoryModel;
