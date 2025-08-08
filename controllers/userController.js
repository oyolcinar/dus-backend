const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

const userController = {
  // Register a new user - this is now handled by authController in authRoutes.js
  // but keeping this for backwards compatibility if needed
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

      // Initialize Supabase client with admin privileges
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) {
        return res.status(400).json({
          message: 'Failed to register with Supabase Auth',
          error: authError.message,
        });
      }

      // Get the Supabase auth_id
      const authId = authData.user.id;

      // Create user in our database with the auth_id
      const newUser = await userModel.createWithAuthId(
        username,
        email,
        password,
        authId,
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          subscriptionType: newUser.subscription_type,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  },

  // Login user - this is now handled by authController in authRoutes.js
  // but keeping this for backwards compatibility if needed
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: 'Email and password are required' });
      }

      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Authenticate with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        return res.status(401).json({
          message: 'Invalid credentials',
          error: authError.message,
        });
      }

      // Get user from our database using auth_id
      const user = await userModel.findByAuthId(authData.user.id);

      if (!user) {
        // Special case: User exists in Supabase but not in our database
        return res.status(404).json({
          message: 'User account not properly set up. Please contact support.',
        });
      }

      // Return user data with token
      res.json({
        message: 'Login successful',
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          subscriptionType: user.subscription_type,
        },
        session: authData.session,
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

      // Map database fields to API format
      const mappedUsers = users.map((user) => ({
        id: user.user_id, // ← Map user_id to id
        userId: user.user_id, // ← Also keep userId for consistency
        username: user.username,
        email: user.email,
        dateRegistered: user.date_registered,
        totalDuels: user.total_duels || 0,
        duelsWon: user.duels_won || 0,
        duelsLost: user.duels_lost || 0,
        subscriptionType: user.subscription_type || 'free',
        // Add any other fields you need
      }));

      res.json(mappedUsers);
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
