/**
 * Authentication controller for Supabase integration with OAuth support
 * ✅ CORRECTED & FULLY UPDATED VERSION
 */
const { createClient } = require('@supabase/supabase-js');
const userModel = require('../models/userModel');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Create a single Supabase client instance for server-side operations
const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false, // Server handles this manually
    persistSession: false, // Server doesn't persist sessions
  },
});

const authController = {
  /**
   * 🚀 SIMPLIFIED & RELIABLE: Gets the mobile app's URL scheme from a single environment variable.
   * This avoids complex, brittle logic based on headers or user agents.
   * @param {boolean} isPasswordReset - If true, appends the password reset path.
   * @returns {string} The full deep link URL for the app.
   */
  getFrontendUrl(isPasswordReset = false) {
    // This MUST be set in your .env file, e.g., MOBILE_APP_SCHEME="dus-app"
    const appScheme = process.env.MOBILE_APP_SCHEME;
    if (!appScheme) {
      console.error(
        'FATAL: MOBILE_APP_SCHEME environment variable is not set!',
      );
      return 'dus-app'; // A safe fallback, but you should set the variable.
    }
    const path = isPasswordReset ? '://reset-password' : '://oauth/callback';
    return `${appScheme}${path}`;
  },

  /**
   * iOS-Specific Redirect Handler.
   * This is a robust fallback that serves an HTML page to help iOS Safari
   * successfully open the deep link.
   */
  handleIOSRedirect(res, redirectUrl, isError = false) {
    console.log('🍎 Handling iOS redirect with HTML fallback:', redirectUrl);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${
            isError ? 'Authentication Error' : 'Authentication Success'
          }</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; color: #333; text-align: center; padding: 20px; }
              .container { background: white; border-radius: 20px; padding: 40px; max-width: 400px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
              h1 { margin: 0 0 20px 0; font-size: 24px; }
              p { margin: 0 0 30px 0; line-height: 1.5; }
              .btn { background: #007aff; color: white; padding: 12px 24px; border-radius: 12px; font-size: 16px; text-decoration: none; display: inline-block; }
          </style>
          <script>
            // Immediately attempt to redirect to the app's deep link.
            window.location.replace('${redirectUrl}');
          </script>
      </head>
      <body>
          <div class="container">
              <h1>${
                isError ? 'Authentication Error' : 'Authentication Success'
              }</h1>
              <p>${
                isError
                  ? 'There was an issue with authentication.'
                  : 'Authentication complete! Redirecting you back to the app...'
              }</p>
              <a href="${redirectUrl}" class="btn">Open App Manually</a>
          </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  },

  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: 'Password must be at least 8 characters long' });
      }

      const { data: authData, error: authError } =
        await supabaseServer.auth.admin.createUser({
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
        if (
          authError.message.includes('already exists') ||
          authError.message.includes('already registered')
        ) {
          return res
            .status(409)
            .json({
              message: 'User with this email already exists',
              error: authError.message,
            });
        }
        if (authError.message.includes('weak password')) {
          return res
            .status(400)
            .json({
              message: 'Password is too weak',
              error: authError.message,
            });
        }
        return res
          .status(400)
          .json({
            message: 'Failed to register with Supabase Auth',
            error: authError.message,
          });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const user = await userModel.findByAuthId(authData.user.id);

      if (!user) {
        console.error('❌ User was not created by database trigger');
        return res.status(500).json({ message: 'User registration failed' });
      }

      console.log(
        `User registered successfully: ${email} (ID: ${user.user_id})`,
      );
      const { data: sessionData, error: sessionError } =
        await supabaseServer.auth.signInWithPassword({ email, password });

      if (sessionError) {
        console.warn(
          'Failed to create session after registration:',
          sessionError,
        );
        return res.status(201).json({
          message: 'User registered successfully, please login',
          user: {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            subscriptionType: user.subscription_type,
          },
          session: null,
        });
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscriptionType: user.subscription_type,
        },
        session: sessionData?.session || null,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: 'Email and password are required' });
      }

      const { data: authData, error: authError } =
        await supabaseServer.auth.signInWithPassword({ email, password });

      if (authError) {
        console.warn(`Failed login attempt for email: ${email}`);
        return res
          .status(401)
          .json({ message: 'Invalid credentials', error: authError.message });
      }

      const user = await userModel.findByAuthId(authData.user.id);
      if (!user) {
        console.error(
          `User exists in Supabase but not in database: ${email}, auth_id: ${authData.user.id}`,
        );
        return res
          .status(404)
          .json({
            message:
              'User account not properly set up. Please contact support.',
          });
      }

      const userRoleData = await userModel.getUserRoleAndPermissions(
        user.user_id,
      );
      console.log(
        `User logged in successfully: ${email} (ID: ${user.user_id})`,
      );
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

  /**
   * ✅ CORRECTED OAUTH CALLBACK
   * This function now correctly constructs the redirect URL using the app's scheme from .env
   */
  async oauthCallback(req, res) {
    console.log('🔄 OAuth callback started');
    try {
      const { code, error, error_description } = req.query;
      const userAgent = req.headers['user-agent'] || '';
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);

      const appCallbackUrl = authController.getFrontendUrl(false);

      if (error) {
        console.error('❌ OAuth error:', { error, error_description });
        const redirectUrl = `${appCallbackUrl}?error=${encodeURIComponent(
          error_description || error,
        )}`;
        if (isIOS)
          return authController.handleIOSRedirect(res, redirectUrl, true);
        return res.redirect(redirectUrl);
      }

      if (!code) {
        console.error('❌ No authorization code received');
        const redirectUrl = `${appCallbackUrl}?error=authorization_required`;
        if (isIOS)
          return authController.handleIOSRedirect(res, redirectUrl, true);
        return res.redirect(redirectUrl);
      }

      const { data, error: authError } =
        await supabaseServer.auth.exchangeCodeForSession(code);
      if (authError) {
        console.error('❌ Failed to exchange code for session:', authError);
        const redirectUrl = `${appCallbackUrl}?error=${encodeURIComponent(
          authError.message,
        )}`;
        if (isIOS)
          return authController.handleIOSRedirect(res, redirectUrl, true);
        return res.redirect(redirectUrl);
      }

      const { user: authUser, session } = data;
      console.log('✅ Session exchange successful for user:', authUser.email);

      let user = null;
      let attempts = 0;
      const maxAttempts = 5;
      while (!user && attempts < maxAttempts) {
        user = await userModel.findByAuthId(authUser.id);
        if (!user) {
          console.log(
            `⏳ User not found yet, attempt ${
              attempts + 1
            }/${maxAttempts}, waiting...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      if (!user) {
        console.error(
          '❌ User was not created by database trigger after several attempts.',
        );
        const redirectUrl = `${appCallbackUrl}?error=user_creation_failed`;
        if (isIOS)
          return authController.handleIOSRedirect(res, redirectUrl, true);
        return res.redirect(redirectUrl);
      }

      console.log('✅ User found in database:', {
        userId: user.user_id,
        email: user.email,
      });

      const redirectUrl = `${appCallbackUrl}?access_token=${session.access_token}&refresh_token=${session.refresh_token}&user_id=${user.user_id}`;
      console.log('✅ OAuth callback successful. Redirecting to:', redirectUrl);

      if (isIOS) {
        return authController.handleIOSRedirect(res, redirectUrl, false);
      }
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      const appCallbackUrl = authController.getFrontendUrl();
      const redirectUrl = `${appCallbackUrl}?error=oauth_failed`;
      return authController.handleIOSRedirect(res, redirectUrl, true);
    }
  },

  async handleOAuthCallbackForFrontend(req, res) {
    try {
      const { code } = req.body || req.query;
      if (!code) {
        return res
          .status(400)
          .json({
            message: 'Authorization code is required',
            code: 'MISSING_CODE',
          });
      }

      console.log('🔄 Processing OAuth callback for frontend integration');
      const { data, error: authError } =
        await supabaseServer.auth.exchangeCodeForSession(code);

      if (authError) {
        console.error('❌ Failed to exchange code for session:', authError);
        return res
          .status(400)
          .json({
            message: 'Failed to exchange authorization code',
            error: authError.message,
            code: 'EXCHANGE_FAILED',
          });
      }

      const { user: authUser, session } = data;
      console.log('✅ Session exchange successful for user:', authUser.email);

      let user = null;
      let attempts = 0;
      const maxAttempts = 5;
      while (!user && attempts < maxAttempts) {
        user = await userModel.findByAuthId(authUser.id);
        if (!user) {
          console.log(
            `⏳ User not found yet, attempt ${
              attempts + 1
            }/${maxAttempts}, waiting...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }
      }

      if (!user) {
        console.error('❌ User was not created by database trigger');
        return res
          .status(500)
          .json({
            message: 'User creation failed',
            code: 'USER_CREATION_FAILED',
          });
      }

      const userRoleData = await userModel.getUserRoleAndPermissions(
        user.user_id,
      );
      console.log('✅ OAuth callback completed successfully via API');
      res.json({
        message: 'OAuth authentication successful',
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscriptionType: user.subscription_type,
          permissions: userRoleData?.permissions || [],
        },
        session: session,
      });
    } catch (error) {
      console.error('❌ OAuth callback API error:', error);
      res
        .status(500)
        .json({
          message: 'OAuth callback processing failed',
          code: 'CALLBACK_ERROR',
        });
    }
  },

  async startOAuth(req, res) {
    try {
      const { provider } = req.params;
      if (!['google', 'apple', 'facebook'].includes(provider)) {
        return res.status(400).json({ message: 'Unsupported OAuth provider' });
      }

      const backendCallbackUrl = `${req.protocol}://${req.get(
        'host',
      )}/api/auth/oauth/callback`;
      console.log(
        `OAuth ${provider} - Backend callback URL:`,
        backendCallbackUrl,
      );

      const { data, error } = await supabaseServer.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: backendCallbackUrl,
          scopes: provider === 'google' ? 'email profile' : undefined,
        },
      });

      if (error) {
        console.error(`${provider} OAuth error:`, error);
        return res
          .status(400)
          .json({
            message: `Failed to start ${provider} OAuth`,
            error: error.message,
          });
      }
      res.json({ message: `${provider} OAuth started`, url: data.url });
    } catch (error) {
      console.error('Start OAuth error:', error);
      res.status(500).json({ message: 'Failed to start OAuth' });
    }
  },

  async appleSignIn(req, res) {
    try {
      const { id_token, nonce } = req.body;
      if (!id_token) {
        return res.status(400).json({ message: 'Apple ID token required' });
      }

      const { data, error } = await supabaseServer.auth.signInWithIdToken({
        provider: 'apple',
        token: id_token,
        nonce: nonce,
      });
      if (error) {
        console.error('Apple Sign In error:', error);
        return res
          .status(400)
          .json({ message: 'Apple Sign In failed', error: error.message });
      }

      const { user: authUser, session } = data;
      let dbUser = await userModel.findByAuthId(authUser.id);
      if (!dbUser) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        dbUser = await userModel.findByAuthId(authUser.id);
        if (!dbUser) {
          console.error(
            'Apple Sign In: User was not created by database trigger',
          );
          return res.status(500).json({ message: 'User creation failed' });
        }
      }
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

  async signOut(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(400).json({ message: 'No active session' });
      }
      const { error } = await supabaseServer.auth.signOut({ jwt: token });
      if (error) {
        console.error('Sign out error:', error);
        return res
          .status(500)
          .json({ message: 'Error signing out', error: error.message });
      }
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

  /**
   * ✅ CORRECTED PASSWORD RESET
   * Now uses the simplified getFrontendUrl to generate the correct deep link.
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
        redirectTo: authController.getFrontendUrl(true), // true for password reset
      });
      if (error) {
        console.error('Password reset request error:', error);
      }
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

  async updatePassword(req, res) {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res
          .status(400)
          .json({
            message:
              'Password is required and must be at least 8 characters long',
          });
      }
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const { error } = await supabaseServer.auth.updateUser({
        password: password,
      });
      if (error) {
        console.error('Password update error:', error);
        return res
          .status(400)
          .json({ message: 'Failed to update password', error: error.message });
      }
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

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res
          .status(400)
          .json({
            message: 'Refresh token is required',
            code: 'MISSING_REFRESH_TOKEN',
          });
      }

      console.log('🔄 Attempting to refresh token via Supabase');
      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: sessionData, error: sessionError } =
        await tempClient.auth.setSession({
          access_token: '',
          refresh_token: refreshToken,
        });

      if (sessionError || !sessionData.session) {
        console.error('Session refresh failed:', sessionError);
        return res
          .status(401)
          .json({
            message: 'Failed to refresh token',
            error: sessionError?.message || 'Invalid refresh token',
            code: 'REFRESH_FAILED',
          });
      }

      const { data: refreshData, error: refreshError } =
        await tempClient.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.error('Token refresh failed:', refreshError);
        return res
          .status(401)
          .json({
            message: 'Failed to refresh token',
            error: refreshError?.message || 'Refresh token expired',
            code: 'REFRESH_EXPIRED',
          });
      }

      console.log('✅ Token refreshed successfully via Supabase');
      res.json({
        message: 'Token refreshed successfully',
        session: refreshData.session,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res
        .status(500)
        .json({ message: 'Failed to refresh token', code: 'REFRESH_ERROR' });
    }
  },

  async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
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
