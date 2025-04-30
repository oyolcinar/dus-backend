const questionModel = require('../models/questionModel');
const testModel = require('../models/testModel');

const questionController = {
  // Create a new question
  async create(req, res) {
    try {
      const { testId, questionText, options, correctAnswer } = req.body;

      // Validate input
      if (!testId || !questionText || !correctAnswer) {
        return res.status(400).json({
          message: 'Test ID, question text, and correct answer are required',
        });
      }

      // Check user permissions (admin or instructor role)
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res
          .status(403)
          .json({ message: 'You do not have permission to create questions' });
      }

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      // Validate options format if provided
      if (options && !Array.isArray(options)) {
        return res
          .status(400)
          .json({ message: 'Options must be provided as an array' });
      }

      // Validate correctAnswer is within available options
      if (options && !options.includes(correctAnswer)) {
        return res
          .status(400)
          .json({
            message: 'Correct answer must be one of the provided options',
          });
      }

      // Create question
      const newQuestion = await questionModel.create(
        testId,
        questionText,
        options || null,
        correctAnswer,
      );

      res.status(201).json({
        message: 'Question created successfully',
        question: newQuestion,
      });
    } catch (error) {
      console.error('Question creation error:', error);
      res.status(500).json({ message: 'Failed to create question' });
    }
  },

  // Get questions by test ID
  async getByTestId(req, res) {
    try {
      const testId = req.params.testId;

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      const questions = await questionModel.getByTestId(testId);
      res.json(questions);
    } catch (error) {
      console.error('Get questions error:', error);
      res.status(500).json({ message: 'Failed to retrieve questions' });
    }
  },

  // Get question by ID
  async getById(req, res) {
    try {
      const questionId = req.params.id;

      const question = await questionModel.getById(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      res.json(question);
    } catch (error) {
      console.error('Get question error:', error);
      res.status(500).json({ message: 'Failed to retrieve question' });
    }
  },

  // Update question
  async update(req, res) {
    try {
      const questionId = req.params.id;
      const { questionText, options, correctAnswer } = req.body;

      // Check user permissions (admin or instructor role)
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res
          .status(403)
          .json({ message: 'You do not have permission to update questions' });
      }

      // Check if question exists
      const existingQuestion = await questionModel.getById(questionId);
      if (!existingQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Validate options format if provided
      if (options !== undefined && !Array.isArray(options)) {
        return res
          .status(400)
          .json({ message: 'Options must be provided as an array' });
      }

      // Determine the correct answer to use
      const finalCorrectAnswer =
        correctAnswer || existingQuestion.correct_answer;

      // Validate correctAnswer is within available options
      const finalOptions =
        options !== undefined ? options : existingQuestion.options;
      if (finalOptions && !finalOptions.includes(finalCorrectAnswer)) {
        return res
          .status(400)
          .json({ message: 'Correct answer must be one of the options' });
      }

      // Update question
      const updatedQuestion = await questionModel.update(
        questionId,
        questionText || existingQuestion.question_text,
        finalOptions,
        finalCorrectAnswer,
      );

      res.json({
        message: 'Question updated successfully',
        question: updatedQuestion,
      });
    } catch (error) {
      console.error('Update question error:', error);
      res.status(500).json({ message: 'Failed to update question' });
    }
  },

  // Delete question
  async delete(req, res) {
    try {
      const questionId = req.params.id;

      // Check user permissions (admin or instructor role)
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res
          .status(403)
          .json({ message: 'You do not have permission to delete questions' });
      }

      // Check if question exists
      const existingQuestion = await questionModel.getById(questionId);
      if (!existingQuestion) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Delete question
      await questionModel.delete(questionId);

      res.json({ message: 'Question deleted successfully' });
    } catch (error) {
      console.error('Delete question error:', error);
      res.status(500).json({ message: 'Failed to delete question' });
    }
  },
};

module.exports = questionController;
