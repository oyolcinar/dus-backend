const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const userController = {
  // Register a new user
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res
          .status(409)
          .json({ message: 'User with this email already exists' });
      }

      // Create new user
      const newUser = await userModel.create(username, email, password);

      // Generate JWT
      const token = jwt.sign(
        { userId: newUser.user_id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          subscriptionType: newUser.subscription_type,
        },
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: 'Email and password are required' });
      }

      // Find user
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.user_id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
      );

      res.json({
        message: 'Login successful',
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          subscriptionType: user.subscription_type,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Failed to log in' });
    }
  },

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        userId: user.user_id,
        username: user.username,
        email: user.email,
        dateRegistered: user.date_registered,
        totalDuels: user.total_duels,
        duelsWon: user.duels_won,
        duelsLost: user.duels_lost,
        longestLosingStreak: user.longest_losing_streak,
        currentLosingStreak: user.current_losing_streak,
        totalStudyTime: user.total_study_time,
        subscriptionType: user.subscription_type,
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: 'Failed to get user profile' });
    }
  },

  // Search for users
  async searchUsers(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.length < 3) {
        return res
          .status(400)
          .json({ message: 'Search query must be at least 3 characters' });
      }

      const users = await userModel.searchUsers(query);
      res.json(users);
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ message: 'Failed to search users' });
    }
  },

  // Get user's duel statistics
  async getDuelStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await userModel.getDuelStats(userId);
      if (!stats) {
        return res.status(404).json({ message: 'Statistics not found' });
      }

      res.json({
        totalDuels: stats.total_duels,
        wins: stats.duels_won,
        losses: stats.duels_lost,
        longestLosingStreak: stats.longest_losing_streak,
        currentLosingStreak: stats.current_losing_streak,
        winRate: parseFloat(stats.win_rate).toFixed(2),
      });
    } catch (error) {
      console.error('Get duel stats error:', error);
      res.status(500).json({ message: 'Failed to get duel statistics' });
    }
  },

  // Update user's study time
  async updateStudyTime(req, res) {
    try {
      const userId = req.user.userId;
      const { duration } = req.body;

      if (duration === undefined || duration <= 0) {
        return res
          .status(400)
          .json({ message: 'Valid study duration is required' });
      }

      const updatedUser = await userModel.updateStudyTime(userId, duration);

      res.json({
        message: 'Study time updated successfully',
        totalStudyTime: updatedUser.total_study_time,
      });
    } catch (error) {
      console.error('Update study time error:', error);
      res.status(500).json({ message: 'Failed to update study time' });
    }
  },
};

module.exports = userController;
