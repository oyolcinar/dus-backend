const answerModel = require('../models/answerModel');
const resultModel = require('../models/resultModel');
const questionModel = require('../models/questionModel');

const answerController = {
  // Create a single answer
  async create(req, res) {
    try {
      const { resultId, questionId, userAnswer, isCorrect } = req.body;

      // Validate input
      if (
        !resultId ||
        !questionId ||
        !userAnswer === undefined ||
        isCorrect === undefined
      ) {
        return res
          .status(400)
          .json({
            message:
              'Result ID, question ID, user answer, and correctness status are required',
          });
      }

      // Check if result exists
      const result = await resultModel.getById(resultId);
      if (!result) {
        return res.status(404).json({ message: 'Test result not found' });
      }

      // Check if question exists
      const question = await questionModel.getById(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Create answer
      const answer = await answerModel.create(
        resultId,
        questionId,
        userAnswer,
        isCorrect,
      );

      res.status(201).json({
        message: 'Answer recorded successfully',
        answer,
      });
    } catch (error) {
      console.error('Answer creation error:', error);
      res.status(500).json({ message: 'Failed to record answer' });
    }
  },

  // Create multiple answers
  async createBatch(req, res) {
    try {
      const { answers } = req.body;

      // Validate input
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res
          .status(400)
          .json({ message: 'Valid answers array is required' });
      }

      // Create answers
      const createdAnswers = await answerModel.createBatch(answers);

      res.status(201).json({
        message: 'Answers recorded successfully',
        answers: createdAnswers,
      });
    } catch (error) {
      console.error('Batch answer creation error:', error);
      res.status(500).json({ message: 'Failed to record answers' });
    }
  },

  // Get answers by result ID
  async getByResultId(req, res) {
    try {
      const resultId = req.params.resultId;

      // Check if result exists
      const result = await resultModel.getById(resultId);
      if (!result) {
        return res.status(404).json({ message: 'Test result not found' });
      }

      // Get answers
      const answers = await answerModel.getByResultId(resultId);

      res.json(answers);
    } catch (error) {
      console.error('Get answers error:', error);
      res.status(500).json({ message: 'Failed to retrieve answers' });
    }
  },
};

module.exports = answerController;
