/**
 * Authentication controller for Supabase integration
 */
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
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }
      
      // Additional password strength validation
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!(hasUpperCase && hasLowerCase && hasNumbers) && !hasSpecialChars) {
        return res.status(400).json({ 
          message: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, and special characters' 
        });
      }

      // Initialize Supabase client with admin privileges
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          subscription_type: 'free',
          role: 'student'
        }
      });

      if (authError) {
        // Check for duplicate email error
        if (authError.message.includes('already exists') || authError.message.includes('already registered')) {
          return res.status(409).json({
            message: 'User with this email already exists',
            error: authError.message
          });
        }
        
        // Check for weak password
        if (authError.message.includes('weak password')) {
          return res.status(400).json({
            message: 'Password is too weak',
            error: authError.message
          });
        }
        
        return res.status(400).json({ 
          message: 'Failed to register with Supabase Auth', 
          error: authError.message 
        });
      }

      // Get the Supabase auth_id
      const authId = authData.user.id;

      // Create user in our database with the auth_id
      const newUser = await userModel.createWithAuthId(username, email, password, authId);

      // Log successful registration
      console.log(`User registered successfully: ${email} (ID: ${newUser.user_id})`);

      // Get the session that was created during signup
      const { data: sessionData } = await supabase.auth.getSession();

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          subscriptionType: newUser.subscription_type
        },
        session: sessionData?.session || null
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
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // Log failed login attempts
        console.warn(`Failed login attempt for email: ${email}`);
        
        return res.status(401).json({ 
          message: 'Invalid credentials', 
          error: authError.message 
        });
      }

      // Get user from our database using auth_id
      const user = await userModel.findByAuthId(authData.user.id);

      if (!user) {
        // Special case: User exists in Supabase but not in our database
        console.error(`User exists in Supabase but not in database: ${email}, auth_id: ${authData.user.id}`);
        
        // Create user record in our database if it doesn't exist
        try {
          // Extract username from email if not available
          const username = email.split('@')[0];
          const newUser = await userModel.createWithAuthId(username, email, password, authData.user.id);
          
          // Get user permissions for the newly created user
          const userRoleData = await userModel.getUserRoleAndPermissions(newUser.user_id);
          
          console.log(`Auto-created missing user record for: ${email} (ID: ${newUser.user_id})`);
          
          return res.json({
            message: 'Login successful',
            user: {
              userId: newUser.user_id,
              username: newUser.username,
              email: newUser.email,
              role: newUser.role,
              subscriptionType: newUser.subscription_type,
              permissions: userRoleData?.permissions || []
            },
            session: authData.session
          });
        } catch (createError) {
          console.error('Error creating missing user record:', createError);
          
          return res.status(404).json({ 
            message: 'User account not properly set up. Please contact support.' 
          });
        }
      }

      // Get user permissions
      const userRoleData = await userModel.getUserRoleAndPermissions(user.user_id);
      
      // Log successful login
      console.log(`User logged in successfully: ${email} (ID: ${user.user_id})`);

      // Return user data with token
      res.json({
        message: 'Login successful',
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscriptionType: user.subscription_type,
          permissions: userRoleData?.permissions || []
        },
        session: authData.session
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
        jwt: token 
      });

      if (error) {
        console.error('Sign out error:', error);
        return res.status(500).json({ 
          message: 'Error signing out',
          error: error.message
        });
      }

      // Log successful sign out
      console.log(`User ${req.user.email} (ID: ${req.user.userId}) signed out successfully`);

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
      
      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const roleData = await userModel.getUserRoleAndPermissions(userId);
      
      if (!roleData) {
        return res.status(404).json({ message: 'User role data not found' });
      }

      res.json({
        role: roleData.role,
        permissions: roleData.permissions || []
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ message: 'Failed to get user permissions' });
    }
  },
  
  // Password reset request
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Send password reset email through Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL || `${process.env.FRONTEND_URL}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset request error:', error);
        // Don't reveal if the email exists in our system for security reasons
        return res.json({ message: 'If your email exists in our system, you will receive a password reset link' });
      }
      
      // Log the password reset request (without revealing success/failure)
      console.log(`Password reset requested for: ${email}`);
      
      res.json({ message: 'If your email exists in our system, you will receive a password reset link' });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  },
  
  // Update user password after reset
  async updatePassword(req, res) {
    try {
      const { password } = req.body;
      
      if (!password || password.length < 8) {
        return res.status(400).json({ 
          message: 'Password is required and must be at least 8 characters long' 
        });
      }
      
      // Additional password strength validation
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!(hasUpperCase && hasLowerCase && hasNumbers) && !hasSpecialChars) {
        return res.status(400).json({ 
          message: 'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, and special characters' 
        });
      }
      
      // Get token from the request (usually from authentication header)
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        console.error('Password update error:', error);
        return res.status(400).json({ 
          message: 'Failed to update password',
          error: error.message
        });
      }
      
      // Log the password update (without revealing the user for security)
      console.log(`Password updated successfully for user ${req.user.userId}`);
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password update error:', error);
      res.status(500).json({ message: 'Failed to update password' });
    }
  },
  
  // Refresh user token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      
      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Refresh the session
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('Token refresh error:', error);
        return res.status(401).json({ 
          message: 'Failed to refresh token',
          error: error.message
        });
      }
      
      if (!data.session) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
      
      res.json({
        message: 'Token refreshed successfully',
        session: data.session
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ message: 'Failed to refresh token' });
    }
  },
  
  // Get current user profile
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get user details from our database
      const user = await userModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get user permissions
      const userRoleData = await userModel.getUserRoleAndPermissions(userId);
      
      res.json({
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscriptionType: user.subscription_type,
          dateRegistered: user.date_registered,
          totalDuels: user.total_duels,
          duelsWon: user.duels_won,
          duelsLost: user.duels_lost,
          totalStudyTime: user.total_study_time,
          permissions: userRoleData?.permissions || []
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Failed to get user profile' });
    }
  }
};

module.exports = authController;
