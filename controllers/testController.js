const testModel = require('../models/testModel');
// Import Supabase client for any direct operations
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const testController = {
  // Create a new test
  async create(req, res) {
    try {
      const { title, description, difficultyLevel, timeLimit } = req.body;

      // Validate input
      if (!title || !difficultyLevel) {
        return res
          .status(400)
          .json({ message: 'Title and difficulty level are required' });
      }

      // Validate difficulty level
      if (difficultyLevel < 1 || difficultyLevel > 5) {
        return res
          .status(400)
          .json({ message: 'Difficulty level must be between 1 and 5' });
      }

      // Validate time limit if provided
      if (timeLimit !== undefined && (timeLimit < 1 || timeLimit > 180)) {
        return res
          .status(400)
          .json({ message: 'Time limit must be between 1 and 180 minutes' });
      }

      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Only administrators can create tests' });
      }

      // Create test with new time limit parameter
      const newTest = await testModel.create(
        title,
        description || null,
        difficultyLevel,
        timeLimit || 30, // Default to 30 minutes if not provided
      );

      res.status(201).json({
        message: 'Test created successfully',
        test: newTest,
      });
    } catch (error) {
      console.error('Test creation error:', error);
      res.status(500).json({ message: 'Failed to create test' });
    }
  },

  // Get all tests
  async getAll(req, res) {
    try {
      const tests = await testModel.getAll();
      res.json(tests);
    } catch (error) {
      console.error('Get tests error:', error);
      res.status(500).json({ message: 'Failed to retrieve tests' });
    }
  },

  // Get test by ID
  async getById(req, res) {
    try {
      const testId = req.params.id;

      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      res.json(test);
    } catch (error) {
      console.error('Get test error:', error);
      res.status(500).json({ message: 'Failed to retrieve test' });
    }
  },

  // Get test with questions
  async getWithQuestions(req, res) {
    try {
      const testId = req.params.id;

      const testWithQuestions = await testModel.getWithQuestions(testId);
      if (!testWithQuestions) {
        return res.status(404).json({ message: 'Test not found' });
      }

      res.json(testWithQuestions);
    } catch (error) {
      console.error('Get test with questions error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve test with questions' });
    }
  },

  // Update test
  async update(req, res) {
    try {
      const testId = req.params.id;
      const { title, description, difficultyLevel, timeLimit } = req.body;

      // Check if test exists
      const existingTest = await testModel.getById(testId);
      if (!existingTest) {
        return res.status(404).json({ message: 'Test not found' });
      }

      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Only administrators can update tests' });
      }

      // Validate difficulty level if provided
      if (
        difficultyLevel !== undefined &&
        (difficultyLevel < 1 || difficultyLevel > 5)
      ) {
        return res
          .status(400)
          .json({ message: 'Difficulty level must be between 1 and 5' });
      }

      // Validate time limit if provided
      if (timeLimit !== undefined && (timeLimit < 1 || timeLimit > 180)) {
        return res
          .status(400)
          .json({ message: 'Time limit must be between 1 and 180 minutes' });
      }

      // Update test
      const updatedTest = await testModel.update(
        testId,
        title || existingTest.title,
        description !== undefined ? description : existingTest.description,
        difficultyLevel || existingTest.difficulty_level,
        timeLimit !== undefined ? timeLimit : existingTest.time_limit,
      );

      res.json({
        message: 'Test updated successfully',
        test: updatedTest,
      });
    } catch (error) {
      console.error('Update test error:', error);
      res.status(500).json({ message: 'Failed to update test' });
    }
  },

  // Delete test
  async delete(req, res) {
    try {
      const testId = req.params.id;

      // Check if test exists
      const existingTest = await testModel.getById(testId);
      if (!existingTest) {
        return res.status(404).json({ message: 'Test not found' });
      }

      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Only administrators can delete tests' });
      }

      // Delete test
      await testModel.delete(testId);

      res.json({ message: 'Test deleted successfully' });
    } catch (error) {
      console.error('Delete test error:', error);
      res.status(500).json({ message: 'Failed to delete test' });
    }
  },
};

module.exports = testController;
