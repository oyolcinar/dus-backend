const answerModel = require('../models/answerModel');
const resultModel = require('../models/resultModel');
const questionModel = require('../models/questionModel');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

const answerController = {
  // Create a single answer
  async create(req, res) {
    try {
      const { resultId, questionId, userAnswer, isCorrect } = req.body;
      const userId = req.user.userId;

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

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
      
      // Verify the result belongs to the current user
      if (result.user_id !== userId) {
        return res.status(403).json({ message: 'You do not have permission to add answers to this result' });
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

      // Log the activity
      console.log(`User ${userId} (${req.user.email}) submitted answer for question ${questionId}: ${isCorrect ? 'correct' : 'incorrect'}`);

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

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Validate input
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res
          .status(400)
          .json({ message: 'Valid answers array is required' });
      }

      // If all answers are for the same result, verify ownership
      if (answers.length > 0) {
        const firstResultId = answers[0].resultId;
        const allSameResult = answers.every(a => a.resultId === firstResultId);
        
        if (allSameResult) {
          const result = await resultModel.getById(firstResultId);
          if (result && result.user_id !== userId) {
            return res.status(403).json({ 
              message: 'You do not have permission to add answers to this result' 
            });
          }
        } else {
          // Need to check each result individually
          for (const answer of answers) {
            const result = await resultModel.getById(answer.resultId);
            if (result && result.user_id !== userId) {
              return res.status(403).json({ 
                message: `You do not have permission to add answers to result ${answer.resultId}` 
              });
            }
          }
        }
      }

      // Create answers
      const createdAnswers = await answerModel.createBatch(answers);

      // Log the activity
      const correctCount = answers.filter(a => a.isCorrect).length;
      console.log(`User ${userId} (${req.user.email}) submitted ${answers.length} answers, ${correctCount} correct`);

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

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check if result exists
      const result = await resultModel.getById(resultId);
      if (!result) {
        return res.status(404).json({ message: 'Test result not found' });
      }
      
      // Verify the user has permission to view these answers
      // Allow the user who owns the result or admins/instructors
      if (result.user_id !== userId && !['admin', 'instructor'].includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'You do not have permission to view these answers' 
        });
      }

      // Get answers
      const answers = await answerModel.getByResultId(resultId);

      // Log the activity
      console.log(`User ${userId} (${req.user.email}) viewed answers for result ${resultId}`);

      res.json(answers);
    } catch (error) {
      console.error('Get answers error:', error);
      res.status(500).json({ message: 'Failed to retrieve answers' });
    }
  },
};

module.exports = answerController;