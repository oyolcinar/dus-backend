const testModel = require('../models/testModel');
const courseModel = require('../models/courseModel');
// Import Supabase client for any direct operations
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const testController = {
  // Create a new test
  async create(req, res) {
    try {
      const { title, description, courseId, difficultyLevel, timeLimit } = req.body;

      // Validate input
      if (!title || !difficultyLevel || !courseId) {
        return res
          .status(400)
          .json({ message: 'Title, course ID, and difficulty level are required' });
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

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Only administrators can create tests' });
      }

      // Create test with course_id
      const newTest = await testModel.create(
        title,
        description || null,
        courseId,
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
      const { courseId, courseType } = req.query;

      let tests;
      if (courseId) {
        tests = await testModel.getByCourseId(courseId);
      } else if (courseType) {
        tests = await testModel.getByCourseType(courseType);
      } else {
        tests = await testModel.getAll();
      }

      res.json(tests);
    } catch (error) {
      console.error('Get tests error:', error);
      res.status(500).json({ message: 'Failed to retrieve tests' });
    }
  },

  // Get tests by course ID
  async getByCourseId(req, res) {
    try {
      const courseId = parseInt(req.params.courseId);

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const tests = await testModel.getByCourseId(courseId);
      res.json(tests);
    } catch (error) {
      console.error('Get tests by course ID error:', error);
      res.status(500).json({ message: 'Failed to retrieve tests by course ID' });
    }
  },

  // Get tests by course type
  async getByCourseType(req, res) {
    try {
      const { courseType } = req.params;

      // Validate course type
      if (!['temel_dersler', 'klinik_dersler'].includes(courseType)) {
        return res.status(400).json({ 
          message: 'Course type must be either "temel_dersler" or "klinik_dersler"' 
        });
      }

      const tests = await testModel.getByCourseType(courseType);
      res.json(tests);
    } catch (error) {
      console.error('Get tests by course type error:', error);
      res.status(500).json({ message: 'Failed to retrieve tests by course type' });
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
      const { title, description, courseId, difficultyLevel, timeLimit } = req.body;

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

      // Validate course ID if provided
      if (courseId !== undefined) {
        const course = await courseModel.getById(courseId);
        if (!course) {
          return res.status(404).json({ message: 'Course not found' });
        }
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
        title,
        description,
        courseId,
        difficultyLevel,
        timeLimit,
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

  // Get test statistics
  async getTestStats(req, res) {
    try {
      const testId = req.params.id;

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      const stats = await testModel.getTestStats(testId);
      
      res.json({
        test: {
          testId: test.test_id,
          title: test.title,
          course: test.courses,
        },
        statistics: stats,
      });
    } catch (error) {
      console.error('Get test statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve test statistics' });
    }
  },

  // Check if user has taken test before
  async checkUserTestHistory(req, res) {
    try {
      const testId = req.params.id;
      const userId = req.user.userId;

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      const history = await testModel.hasUserTakenTest(userId, testId);
      
      res.json({
        testId,
        userId,
        ...history,
      });
    } catch (error) {
      console.error('Check user test history error:', error);
      res.status(500).json({ message: 'Failed to check user test history' });
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
