/**
 * Authentication controller for Supabase integration with OAuth support
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

const authController = {
  // Smart URL detection for different build types - FIXED VERSION
  getFrontendUrl(req, isPasswordReset = false) {
    // Check for custom header from mobile app
    const buildType = req.headers['x-build-type']; // 'expo-go' or 'eas-build'
    const customScheme = req.headers['x-app-scheme']; // Custom scheme from app

    // Enhanced logging for debugging
    console.log('getFrontendUrl DEBUG:', {
      buildType,
      customScheme,
      isPasswordReset,
      'User-Agent': req.headers['user-agent'],
      FRONTEND_URL_EXPO_GO: process.env.FRONTEND_URL_EXPO_GO,
      FRONTEND_URL_EAS_BUILD: process.env.FRONTEND_URL_EAS_BUILD,
      FRONTEND_URL_DEFAULT: process.env.FRONTEND_URL_DEFAULT,
    });

    // If app sends custom scheme, use it (this is the preferred method)
    if (customScheme) {
      const suffix = isPasswordReset ? '/reset-password' : '';
      const finalUrl = `${customScheme}${suffix}`;
      console.log(`Using custom scheme: ${finalUrl}`);
      return finalUrl;
    }

    // Based on build type header
    if (buildType === 'expo-go') {
      const url = isPasswordReset
        ? process.env.PASSWORD_RESET_REDIRECT_URL_EXPO_GO
        : process.env.FRONTEND_URL_EXPO_GO;
      console.log(`Using Expo Go URL: ${url}`);
      return url;
    }

    if (buildType === 'eas-build') {
      const url = isPasswordReset
        ? process.env.PASSWORD_RESET_REDIRECT_URL_EAS_BUILD
        : process.env.FRONTEND_URL_EAS_BUILD;
      console.log(`Using EAS build URL: ${url}`);
      return url;
    }

    // Default to EAS build URLs (production) - FIXED DEFAULT VALUES
    const defaultUrl = isPasswordReset
      ? process.env.PASSWORD_RESET_REDIRECT_URL_DEFAULT ||
        'dus-app://reset-password' // Fixed: was using wrong scheme
      : process.env.FRONTEND_URL_DEFAULT || 'dus-app://'; // Fixed: was using wrong scheme

    // Log the redirect URL for debugging
    console.log(
      `OAuth redirect URL (default): ${defaultUrl} (build-type: ${
        buildType || 'default'
      })`,
    );

    return defaultUrl;
  },

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
        return res
          .status(400)
          .json({ message: 'Password must be at least 8 characters long' });
      }

      // Additional password strength validation
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!(hasUpperCase && hasLowerCase && hasNumbers) && !hasSpecialChars) {
        return res.status(400).json({
          message:
            'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, and special characters',
        });
      }

      // Initialize Supabase client with admin privileges
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            subscription_type: 'free',
            role: 'student',
          },
        });

      if (authError) {
        // Check for duplicate email error
        if (
          authError.message.includes('already exists') ||
          authError.message.includes('already registered')
        ) {
          return res.status(409).json({
            message: 'User with this email already exists',
            error: authError.message,
          });
        }

        // Check for weak password
        if (authError.message.includes('weak password')) {
          return res.status(400).json({
            message: 'Password is too weak',
            error: authError.message,
          });
        }

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

      // Log successful registration
      console.log(
        `User registered successfully: ${email} (ID: ${newUser.user_id})`,
      );

      // FIXED: Create a proper session for the new user
      const { data: sessionData, error: sessionError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (sessionError) {
        console.warn(
          'Failed to create session after registration:',
          sessionError,
        );
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          subscriptionType: newUser.subscription_type,
        },
        session: sessionData?.session || null,
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
        // Log failed login attempts
        console.warn(`Failed login attempt for email: ${email}`);

        return res.status(401).json({
          message: 'Invalid credentials',
          error: authError.message,
        });
      }

      // Get user from our database using auth_id
      const user = await userModel.findByAuthId(authData.user.id);

      if (!user) {
        // Special case: User exists in Supabase but not in our database
        console.error(
          `User exists in Supabase but not in database: ${email}, auth_id: ${authData.user.id}`,
        );

        // Create user record in our database if it doesn't exist
        try {
          // Extract username from email if not available
          const username = email.split('@')[0];
          const newUser = await userModel.createWithAuthId(
            username,
            email,
            password,
            authData.user.id,
          );

          // Get user permissions for the newly created user
          const userRoleData = await userModel.getUserRoleAndPermissions(
            newUser.user_id,
          );

          console.log(
            `Auto-created missing user record for: ${email} (ID: ${newUser.user_id})`,
          );

          return res.json({
            message: 'Login successful',
            user: {
              userId: newUser.user_id,
              username: newUser.username,
              email: newUser.email,
              role: newUser.role,
              subscriptionType: newUser.subscription_type,
              permissions: userRoleData?.permissions || [],
            },
            session: authData.session,
          });
        } catch (createError) {
          console.error('Error creating missing user record:', createError);

          return res.status(404).json({
            message:
              'User account not properly set up. Please contact support.',
          });
        }
      }

      // Get user permissions
      const userRoleData = await userModel.getUserRoleAndPermissions(
        user.user_id,
      );

      // Log successful login
      console.log(
        `User logged in successfully: ${email} (ID: ${user.user_id})`,
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

  // In authController.js - oauthCallback function
  async oauthCallback(req, res) {
    try {
      const { code, error, error_description } = req.query;

      if (error) {
        const redirectUrl = `${authController.getFrontendUrl(
          req,
        )}#error=${encodeURIComponent(error_description || error)}`;
        return res.redirect(redirectUrl);
      }

      if (!code) {
        const redirectUrl = `${authController.getFrontendUrl(
          req,
        )}#error=authorization_required`;
        return res.redirect(redirectUrl);
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Exchange code for session
      const { data, error: authError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (authError) {
        const redirectUrl = `${authController.getFrontendUrl(
          req,
        )}#error=${encodeURIComponent(authError.message)}`;
        return res.redirect(redirectUrl);
      }

      const { user: authUser, session } = data;

      // Check if user exists in database
      let user = await userModel.findByAuthId(authUser.id);

      if (!user) {
        // Create new OAuth user
        const provider = authUser.app_metadata?.provider || 'oauth';
        const userData = authController.extractUserDataFromProvider(
          authUser,
          provider,
        );
        user = await userModel.createOAuthUser(
          userData.username,
          userData.email,
          authUser.id,
          provider,
        );
      }

      // FIXED: Redirect to mobile app with tokens in URL fragment
      const redirectUrl = `${authController.getFrontendUrl(req)}#access_token=${
        session.access_token
      }&refresh_token=${session.refresh_token}`;

      console.log(`OAuth success redirect: ${redirectUrl}`);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const redirectUrl = `${authController.getFrontendUrl(
        req,
      )}#error=oauth_failed`;
      res.redirect(redirectUrl);
    }
  },

  // Start OAuth flow - UPDATED FOR DIRECT MOBILE REDIRECT
  // In authController.js - startOAuth function
  async startOAuth(req, res) {
    try {
      const { provider } = req.params;

      if (!['google', 'apple', 'facebook'].includes(provider)) {
        return res.status(400).json({ message: 'Unsupported OAuth provider' });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // FIXED: Use backend callback URL first, then redirect to mobile
      const backendCallbackUrl = `${req.protocol}://${req.get(
        'host',
      )}/api/auth/oauth/callback`;

      console.log(
        `OAuth ${provider} - Backend callback URL:`,
        backendCallbackUrl,
      );

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: backendCallbackUrl, // Backend handles callback first
          scopes: provider === 'google' ? 'email profile' : undefined,
        },
      });

      if (error) {
        console.error(`${provider} OAuth error:`, error);
        return res.status(400).json({
          message: `Failed to start ${provider} OAuth`,
          error: error.message,
        });
      }

      res.json({
        message: `${provider} OAuth started`,
        url: data.url,
      });
    } catch (error) {
      console.error('Start OAuth error:', error);
      res.status(500).json({ message: 'Failed to start OAuth' });
    }
  },

  // Apple Sign In specific handler for mobile
  async appleSignIn(req, res) {
    try {
      const { id_token, user, nonce } = req.body;

      if (!id_token) {
        return res.status(400).json({ message: 'Apple ID token required' });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify Apple ID token with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: id_token,
        nonce: nonce,
      });

      if (error) {
        console.error('Apple Sign In error:', error);
        return res.status(400).json({
          message: 'Apple Sign In failed',
          error: error.message,
        });
      }

      const { user: authUser, session } = data;

      // Check if user exists in our database
      let dbUser = await userModel.findByAuthId(authUser.id);

      if (!dbUser) {
        // Extract user info from Apple response
        const username =
          user?.name?.firstName && user?.name?.lastName
            ? `${user.name.firstName} ${user.name.lastName}`
            : authUser.email?.split('@')[0] || `user_${Date.now()}`;

        const email = authUser.email || user?.email;

        dbUser = await userModel.createOAuthUser(
          username,
          email,
          authUser.id,
          'apple',
        );

        console.log(`Apple user created: ${email}`);
      }

      // Get user permissions
      const userRoleData = await userModel.getUserRoleAndPermissions(
        dbUser.user_id,
      );

      res.json({
        message: 'Apple Sign In successful',
        user: {
          userId: dbUser.user_id,
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role,
          subscriptionType: dbUser.subscription_type,
          permissions: userRoleData?.permissions || [],
        },
        session,
      });
    } catch (error) {
      console.error('Apple Sign In error:', error);
      res.status(500).json({ message: 'Apple Sign In failed' });
    }
  },

  // Extract user data based on OAuth provider
  extractUserDataFromProvider(authUser, provider) {
    let username, email;

    switch (provider) {
      case 'google':
        username =
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0];
        email = authUser.email;
        break;

      case 'facebook':
        username =
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0];
        email = authUser.email;
        break;

      case 'apple':
        username =
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          `user_${Date.now()}`;
        email = authUser.email || authUser.user_metadata?.email;
        break;

      default:
        username = authUser.email?.split('@')[0] || `user_${Date.now()}`;
        email = authUser.email;
    }

    return { username, email };
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
        console.error('Sign out error:', error);
        return res.status(500).json({
          message: 'Error signing out',
          error: error.message,
        });
      }

      // Log successful sign out
      console.log(
        `User ${req.user?.email || 'unknown'} (ID: ${
          req.user?.userId || 'unknown'
        }) signed out successfully`,
      );

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
        permissions: roleData.permissions || [],
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ message: 'Failed to get user permissions' });
    }
  },

  // Password reset request - FIXED: Use proper function reference
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
        redirectTo: authController.getFrontendUrl(req, true), // true for password reset
      });

      if (error) {
        console.error('Password reset request error:', error);
        // Don't reveal if the email exists in our system for security reasons
        return res.json({
          message:
            'If your email exists in our system, you will receive a password reset link',
        });
      }

      // Log the password reset request (without revealing success/failure)
      console.log(`Password reset requested for: ${email}`);

      res.json({
        message:
          'If your email exists in our system, you will receive a password reset link',
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res
        .status(500)
        .json({ message: 'Failed to process password reset request' });
    }
  },

  // Update user password after reset
  async updatePassword(req, res) {
    try {
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({
          message:
            'Password is required and must be at least 8 characters long',
        });
      }

      // Additional password strength validation
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!(hasUpperCase && hasLowerCase && hasNumbers) && !hasSpecialChars) {
        return res.status(400).json({
          message:
            'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, and special characters',
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
        password: password,
      });

      if (error) {
        console.error('Password update error:', error);
        return res.status(400).json({
          message: 'Failed to update password',
          error: error.message,
        });
      }

      // Log the password update (without revealing the user for security)
      console.log(
        `Password updated successfully for user ${
          req.user?.userId || 'unknown'
        }`,
      );

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
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Token refresh error:', error);
        return res.status(401).json({
          message: 'Failed to refresh token',
          error: error.message,
        });
      }

      if (!data.session) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      res.json({
        message: 'Token refreshed successfully',
        session: data.session,
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
          permissions: userRoleData?.permissions || [],
        },
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Failed to get user profile' });
    }
  },
};

module.exports = authController;
