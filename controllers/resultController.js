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

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
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
      const userId = req.user.userId;

      const results = await resultModel.getByUserId(userId);
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

      // Verify that the result belongs to the user
      if (result.user_id !== userId) {
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

      res.json({
        testId,
        testTitle: test.title,
        averageScore: parseFloat(stats.average_score) || 0,
        attemptCount: parseInt(stats.attempt_count) || 0,
      });
    } catch (error) {
      console.error('Get test stats error:', error);
      res.status(500).json({ message: 'Failed to retrieve test statistics' });
    }
  },
};

module.exports = resultController;
