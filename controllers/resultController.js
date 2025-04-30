const resultModel = require('../models/resultModel');
const answerModel = require('../models/answerModel');
const testModel = require('../models/testModel');
const userModel = require('../models/userModel');

const resultController = {
  // Submit a test result with answers
  async submitTest(req, res) {
    try {
      const userId = req.user.userId;
      const { testId, score, timeTaken, answers } = req.body;

      // Validate input
      if (
        !testId ||
        score === undefined ||
        !answers ||
        !Array.isArray(answers)
      ) {
        return res
          .status(400)
          .json({ message: 'Test ID, score, and answers are required' });
      }

      // Validate score is a number between 0 and 100
      if (isNaN(score) || score < 0 || score > 100) {
        return res
          .status(400)
          .json({ message: 'Score must be a number between 0 and 100' });
      }

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      // Check each answer has required fields
      for (const answer of answers) {
        if (
          !answer.questionId ||
          answer.userAnswer === undefined ||
          answer.isCorrect === undefined
        ) {
          return res
            .status(400)
            .json({
              message:
                'Each answer must have questionId, userAnswer, and isCorrect fields',
            });
        }
      }

      // Create test result
      const newResult = await resultModel.create(
        userId,
        testId,
        score,
        timeTaken || null,
      );

      // Process answers
      const formattedAnswers = answers.map((answer) => ({
        resultId: newResult.result_id,
        questionId: answer.questionId,
        userAnswer: answer.userAnswer,
        isCorrect: answer.isCorrect,
      }));

      await answerModel.createBatch(formattedAnswers);

      // Update user statistics if needed
      try {
        await userModel.updateTestStats(userId, score);
      } catch (statsError) {
        console.warn('Failed to update user test statistics:', statsError);
        // Continue with the response even if stats update fails
      }

      res.status(201).json({
        message: 'Test result submitted successfully',
        result: newResult,
      });
    } catch (error) {
      console.error('Submit test error:', error);
      res.status(500).json({ message: 'Failed to submit test result' });
    }
  },

  // Get user's test results
  async getUserResults(req, res) {
    try {
      // Allow getting results for a specific user if admin
      const targetUserId =
        req.query.userId && req.user.role === 'admin'
          ? req.query.userId
          : req.user.userId;

      const results = await resultModel.getByUserId(targetUserId);
      res.json(results);
    } catch (error) {
      console.error('Get results error:', error);
      res.status(500).json({ message: 'Failed to retrieve test results' });
    }
  },

  // Get specific test result with answers
  async getResultDetails(req, res) {
    try {
      const userId = req.user.userId;
      const resultId = req.params.id;

      // Get result details
      const result = await resultModel.getById(resultId);
      if (!result) {
        return res.status(404).json({ message: 'Result not found' });
      }

      // Verify that the result belongs to the user or user is admin
      if (result.user_id !== userId && req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Unauthorized access to this result' });
      }

      // Get answers
      const answers = await answerModel.getByResultId(resultId);

      res.json({
        result,
        answers,
      });
    } catch (error) {
      console.error('Get result details error:', error);
      res.status(500).json({ message: 'Failed to retrieve result details' });
    }
  },

  // Get test statistics
  async getTestStats(req, res) {
    try {
      const testId = req.params.testId;

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      // Get statistics
      const stats = await resultModel.getAverageScoreByTest(testId);

      // Format numbers with proper precision
      const averageScore =
        parseFloat(parseFloat(stats.average_score).toFixed(2)) || 0;
      const attemptCount = parseInt(stats.attempt_count) || 0;

      // Get top performers if admin
      let topPerformers = [];
      if (req.user && req.user.role === 'admin') {
        // This would require implementing a new function in the resultModel
        // topPerformers = await resultModel.getTopPerformersByTest(testId, 5);
      }

      res.json({
        testId,
        testTitle: test.title,
        averageScore,
        attemptCount,
        ...(topPerformers.length > 0 && { topPerformers }),
      });
    } catch (error) {
      console.error('Get test stats error:', error);
      res.status(500).json({ message: 'Failed to retrieve test statistics' });
    }
  },

  // Get user's performance trends (for student dashboard)
  async getUserPerformanceTrends(req, res) {
    try {
      const userId = req.user.userId;

      // This would require implementing a new function in the resultModel
      // const trends = await resultModel.getUserPerformanceTrends(userId);

      // For now, we'll just return the user's results
      const results = await resultModel.getByUserId(userId);

      // Calculate average score
      const totalScore = results.reduce(
        (sum, result) => sum + Number(result.score),
        0,
      );
      const averageScore =
        results.length > 0
          ? parseFloat((totalScore / results.length).toFixed(2))
          : 0;

      res.json({
        userId,
        testCount: results.length,
        averageScore,
        results: results.slice(0, 5), // Return only the 5 most recent tests
      });
    } catch (error) {
      console.error('Get user performance trends error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve performance trends' });
    }
  },
};

module.exports = resultController;
