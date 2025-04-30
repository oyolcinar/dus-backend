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
      const { title, description, difficultyLevel } = req.body;

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

      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Only administrators can create tests' });
      }

      // Create test
      const newTest = await testModel.create(
        title,
        description || null,
        difficultyLevel,
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

  // Update test
  async update(req, res) {
    try {
      const testId = req.params.id;
      const { title, description, difficultyLevel } = req.body;

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

      // Update test
      const updatedTest = await testModel.update(
        testId,
        title || existingTest.title,
        description !== undefined ? description : existingTest.description,
        difficultyLevel || existingTest.difficulty_level,
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
