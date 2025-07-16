const answerModel = require('../models/answerModel');
const resultModel = require('../models/resultModel');
const questionModel = require('../models/questionModel');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

const answerController = {
  // Create a single answer
  async create(req, res) {
    try {
      const { resultId, questionId, userAnswer, isCorrect, answerDefinition } =
        req.body;
      const userId = req.user.userId;

      // Validate input
      if (
        !resultId ||
        !questionId ||
        userAnswer === undefined ||
        isCorrect === undefined
      ) {
        return res.status(400).json({
          message:
            'Result ID, question ID, user answer, and correctness status are required',
        });
      }

      // Check if result exists
      const result = await resultModel.getById(resultId);
      if (!result) {
        return res.status(404).json({ message: 'Test result not found' });
      }

      // Verify the result belongs to the current user
      if (result.user_id !== userId) {
        return res.status(403).json({
          message: 'You do not have permission to add answers to this result',
        });
      }

      // Check if question exists
      const question = await questionModel.getById(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Create answer with optional answer definition
      const answer = await answerModel.create(
        resultId,
        questionId,
        userAnswer,
        isCorrect,
        answerDefinition,
      );

      // Log the activity
      console.log(
        `User ${userId} (${
          req.user.email
        }) submitted answer for question ${questionId}: ${
          isCorrect ? 'correct' : 'incorrect'
        }${answerDefinition ? ' with explanation' : ''}`,
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
      const userId = req.user.userId;

      // Validate input
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res
          .status(400)
          .json({ message: 'Valid answers array is required' });
      }

      // Validate each answer object
      for (const answer of answers) {
        if (
          !answer.resultId ||
          !answer.questionId ||
          answer.userAnswer === undefined ||
          answer.isCorrect === undefined
        ) {
          return res.status(400).json({
            message:
              'Each answer must have resultId, questionId, userAnswer, and isCorrect fields',
          });
        }
      }

      // If all answers are for the same result, verify ownership
      if (answers.length > 0) {
        const firstResultId = answers[0].resultId;
        const allSameResult = answers.every(
          (a) => a.resultId === firstResultId,
        );

        if (allSameResult) {
          const result = await resultModel.getById(firstResultId);
          if (result && result.user_id !== userId) {
            return res.status(403).json({
              message:
                'You do not have permission to add answers to this result',
            });
          }
        } else {
          // Need to check each result individually
          for (const answer of answers) {
            const result = await resultModel.getById(answer.resultId);
            if (result && result.user_id !== userId) {
              return res.status(403).json({
                message: `You do not have permission to add answers to result ${answer.resultId}`,
              });
            }
          }
        }
      }

      // Create answers (answerDefinition is optional and will be handled by the model)
      const createdAnswers = await answerModel.createBatch(answers);

      // Log the activity
      const correctCount = answers.filter((a) => a.isCorrect).length;
      const withExplanations = answers.filter((a) => a.answerDefinition).length;
      console.log(
        `User ${userId} (${req.user.email}) submitted ${
          answers.length
        } answers, ${correctCount} correct${
          withExplanations > 0 ? `, ${withExplanations} with explanations` : ''
        }`,
      );

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
      const userId = req.user.userId;

      // Check if result exists
      const result = await resultModel.getById(resultId);
      if (!result) {
        return res.status(404).json({ message: 'Test result not found' });
      }

      // Verify the user has permission to view these answers
      // Allow the user who owns the result or admins/instructors
      if (
        result.user_id !== userId &&
        !['admin', 'instructor'].includes(req.user.role)
      ) {
        return res.status(403).json({
          message: 'You do not have permission to view these answers',
        });
      }

      // Get answers (now includes answer_definition)
      const answers = await answerModel.getByResultId(resultId);

      // Log the activity
      console.log(
        `User ${userId} (${req.user.email}) viewed answers for result ${resultId}`,
      );

      res.json(answers);
    } catch (error) {
      console.error('Get answers error:', error);
      res.status(500).json({ message: 'Failed to retrieve answers' });
    }
  },

  // Get incorrect answers with explanations for the current user
  async getIncorrectAnswersWithExplanations(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 10;

      // Get incorrect answers with explanations
      const incorrectAnswers =
        await answerModel.getIncorrectAnswersWithExplanations(userId, limit);

      // Log the activity
      console.log(
        `User ${userId} (${req.user.email}) viewed incorrect answers with explanations`,
      );

      res.json({
        incorrectAnswers,
        count: incorrectAnswers.length,
      });
    } catch (error) {
      console.error('Get incorrect answers with explanations error:', error);
      res
        .status(500)
        .json({
          message: 'Failed to retrieve incorrect answers with explanations',
        });
    }
  },

  // Update answer definition for an existing answer
  async updateAnswerDefinition(req, res) {
    try {
      const { answerId } = req.params;
      const { answerDefinition } = req.body;
      const userId = req.user.userId;

      // Validate input
      if (!answerDefinition) {
        return res.status(400).json({
          message: 'Answer definition is required',
        });
      }

      // First, get the answer to verify ownership
      const answers = await answerModel.getByResultId(null); // We need a different approach here

      // For security, we should verify the user owns this answer
      // This requires getting the answer's result and checking ownership
      // For now, let's allow admins/instructors to update any answer definition
      if (!['admin', 'instructor'].includes(req.user.role)) {
        // For regular users, we'd need to verify they own the answer
        // This would require a new method in the model to get answer by ID with ownership check
        return res.status(403).json({
          message: 'Only admins and instructors can update answer definitions',
        });
      }

      // Update the answer definition
      const updatedAnswer = await answerModel.updateAnswerDefinition(
        answerId,
        answerDefinition,
      );

      // Log the activity
      console.log(
        `User ${userId} (${req.user.email}) updated answer definition for answer ${answerId}`,
      );

      res.json({
        message: 'Answer definition updated successfully',
        answer: updatedAnswer,
      });
    } catch (error) {
      console.error('Update answer definition error:', error);
      res.status(500).json({ message: 'Failed to update answer definition' });
    }
  },

  // Get answer explanation statistics for the current user
  async getAnswerExplanationStats(req, res) {
    try {
      const userId = req.user.userId;

      // Get statistics
      const stats = await answerModel.getAnswerExplanationStats(userId);

      // Log the activity
      console.log(
        `User ${userId} (${req.user.email}) viewed answer explanation statistics`,
      );

      res.json(stats);
    } catch (error) {
      console.error('Get answer explanation stats error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve answer explanation statistics' });
    }
  },
};

module.exports = answerController;
