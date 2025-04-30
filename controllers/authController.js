const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

const authController = {
  // Register a new user with Supabase
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
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
          role: newUser.role,
          subscriptionType: newUser.subscription_type,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  },

  // Login with Supabase Auth
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
        // Special case: User exists in Supabase but not in our database (rare)
        // This might happen if the user was created in Supabase but the process failed
        // before creating the user in our database
        // You should create a placeholder user or handle this as needed
        return res.status(404).json({
          message: 'User account not properly set up. Please contact support.',
        });
      }

      // Get user permissions
      const userRoleData = await userModel.getUserRoleAndPermissions(
        user.user_id,
      );

      // Return user data with token
      res.json({
        message: 'Login successful',
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscriptionType: user.subscription_type,
          permissions: userRoleData?.permissions || [],
        },
        session: authData.session,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Failed to log in' });
    }
  },

  // Sign out a user
  async signOut(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(400).json({ message: 'No active session' });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Sign out the user from Supabase
      const { error } = await supabase.auth.signOut({
        jwt: token,
      });

      if (error) {
        return res.status(500).json({
          message: 'Error signing out',
          error: error.message,
        });
      }

      res.json({ message: 'Successfully signed out' });
    } catch (error) {
      console.error('Sign out error:', error);
      res.status(500).json({ message: 'Failed to sign out' });
    }
  },

  // Get user role and permissions
  async getUserPermissions(req, res) {
    try {
      const userId = req.user.userId;
      const roleData = await userModel.getUserRoleAndPermissions(userId);

      if (!roleData) {
        return res.status(404).json({ message: 'User role data not found' });
      }

      res.json({
        role: roleData.role,
        permissions: roleData.permissions || [],
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ message: 'Failed to get user permissions' });
    }
  },
};

module.exports = authController;
