const userQuestionHistoryModel = require('../models/userQuestionHistoryModel');

const userQuestionHistoryController = {
  // Check if user has answered a specific question before
  async checkUserAnsweredQuestion(req, res) {
    try {
      const userId = req.user.userId;
      const questionId = parseInt(req.params.questionId);

      if (!questionId) {
        return res.status(400).json({ message: 'Question ID is required' });
      }

      const history = await userQuestionHistoryModel.hasUserAnsweredQuestion(userId, questionId);
      
      res.json({
        questionId,
        userId,
        ...history,
      });
    } catch (error) {
      console.error('Check user answered question error:', error);
      res.status(500).json({ message: 'Failed to check user question history' });
    }
  },

  // Get user's question history for a specific test
  async getUserTestQuestionHistory(req, res) {
    try {
      const userId = req.user.userId;
      const testId = parseInt(req.params.testId);

      if (!testId) {
        return res.status(400).json({ message: 'Test ID is required' });
      }

      const history = await userQuestionHistoryModel.getUserTestQuestionHistory(userId, testId);
      
      res.json({
        userId,
        testId,
        history,
      });
    } catch (error) {
      console.error('Get user test question history error:', error);
      res.status(500).json({ message: 'Failed to retrieve user test question history' });
    }
  },

  // Get user's question history for a specific course
  async getUserCourseQuestionHistory(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.courseId);

      if (!courseId) {
        return res.status(400).json({ message: 'Course ID is required' });
      }

      const history = await userQuestionHistoryModel.getUserCourseQuestionHistory(userId, courseId);
      
      res.json({
        userId,
        courseId,
        history,
      });
    } catch (error) {
      console.error('Get user course question history error:', error);
      res.status(500).json({ message: 'Failed to retrieve user course question history' });
    }
  },

  // Get user's complete question history
  async getUserQuestionHistory(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 100;

      if (limit > 500) {
        return res.status(400).json({ message: 'Limit cannot exceed 500' });
      }

      const history = await userQuestionHistoryModel.getUserQuestionHistory(userId, limit);
      
      res.json({
        userId,
        limit,
        history,
      });
    } catch (error) {
      console.error('Get user question history error:', error);
      res.status(500).json({ message: 'Failed to retrieve user question history' });
    }
  },

  // Get user's course statistics
  async getUserCourseStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await userQuestionHistoryModel.getUserCourseStats(userId);
      
      res.json({
        userId,
        courseStats: stats,
      });
    } catch (error) {
      console.error('Get user course statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve user course statistics' });
    }
  },

  // Get user's question statistics for a specific course
  async getUserCourseQuestionStats(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.courseId);

      if (!courseId) {
        return res.status(400).json({ message: 'Course ID is required' });
      }

      const stats = await userQuestionHistoryModel.getUserCourseQuestionStats(userId, courseId);
      
      res.json({
        userId,
        courseId,
        statistics: stats,
      });
    } catch (error) {
      console.error('Get user course question statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve user course question statistics' });
    }
  },

  // Get user's recent incorrect answers for review
  async getUserIncorrectAnswers(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;
      const limit = parseInt(req.query.limit) || 50;

      if (limit > 200) {
        return res.status(400).json({ message: 'Limit cannot exceed 200' });
      }

      const incorrectAnswers = await userQuestionHistoryModel.getUserIncorrectAnswers(userId, courseId, limit);
      
      res.json({
        userId,
        courseId,
        limit,
        incorrectAnswers,
      });
    } catch (error) {
      console.error('Get user incorrect answers error:', error);
      res.status(500).json({ message: 'Failed to retrieve user incorrect answers' });
    }
  },

  // Get user's question performance trends
  async getUserQuestionTrends(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;
      const days = parseInt(req.query.days) || 30;

      if (days > 365) {
        return res.status(400).json({ message: 'Days cannot exceed 365' });
      }

      const trends = await userQuestionHistoryModel.getUserQuestionTrends(userId, courseId, days);
      
      res.json({
        userId,
        courseId,
        days,
        trends,
      });
    } catch (error) {
      console.error('Get user question trends error:', error);
      res.status(500).json({ message: 'Failed to retrieve user question trends' });
    }
  },

  // Get questions that user should review (frequently missed)
  async getQuestionsForReview(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;
      const limit = parseInt(req.query.limit) || 20;

      if (limit > 100) {
        return res.status(400).json({ message: 'Limit cannot exceed 100' });
      }

      const reviewQuestions = await userQuestionHistoryModel.getQuestionsForReview(userId, courseId, limit);
      
      res.json({
        userId,
        courseId,
        limit,
        reviewQuestions,
      });
    } catch (error) {
      console.error('Get questions for review error:', error);
      res.status(500).json({ message: 'Failed to retrieve questions for review' });
    }
  },

  // Get user's performance summary
  async getUserPerformanceSummary(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;

      // Get multiple statistics in parallel
      const [courseStats, incorrectAnswers, trends, reviewQuestions] = await Promise.all([
        courseId 
          ? userQuestionHistoryModel.getUserCourseQuestionStats(userId, courseId)
          : userQuestionHistoryModel.getUserCourseStats(userId),
        userQuestionHistoryModel.getUserIncorrectAnswers(userId, courseId, 10),
        userQuestionHistoryModel.getUserQuestionTrends(userId, courseId, 7),
        userQuestionHistoryModel.getQuestionsForReview(userId, courseId, 5),
      ]);

      res.json({
        userId,
        courseId,
        summary: {
          courseStats,
          recentIncorrectAnswers: incorrectAnswers,
          weeklyTrends: trends,
          questionsForReview: reviewQuestions,
        },
      });
    } catch (error) {
      console.error('Get user performance summary error:', error);
      res.status(500).json({ message: 'Failed to retrieve user performance summary' });
    }
  },
};

module.exports = userQuestionHistoryController;
