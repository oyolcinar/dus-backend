/**
 * Enhanced Middleware for authentication with Supabase
 * This handles JWT validation with proper session management
 */
const { supabaseUrl, supabaseKey } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const db = require('../config/db');

// Create a single Supabase client instance for the middleware
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const authSupabaseMiddleware = async (req, res, next) => {
  try {
    // Get the token from the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        message: 'Authentication token required',
        code: 'TOKEN_REQUIRED',
      });
    }

    console.log('🔍 Validating token for middleware');

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);

    if (error) {
      console.error('Supabase token validation error:', error);

      // More specific error handling
      if (error.message.includes('Invalid JWT')) {
        return res.status(401).json({
          message: 'Invalid authentication token',
          code: 'INVALID_TOKEN',
        });
      } else if (error.message.includes('JWT expired')) {
        return res.status(401).json({
          message: 'Authentication token expired',
          code: 'TOKEN_EXPIRED',
        });
      } else {
        return res.status(401).json({
          message: 'Authentication failed',
          code: 'AUTH_FAILED',
        });
      }
    }

    if (!user) {
      console.warn('No user found for valid token');
      return res.status(401).json({
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      });
    }

    console.log('✅ Token validated for user:', user.email);

    // Get the user from our database using auth_id
    const query = `
      SELECT user_id, username, email, role, subscription_type, auth_id
      FROM users 
      WHERE auth_id = $1
    `;

    let dbUser;
    try {
      const result = await db.query(query, [user.id]);
      dbUser = result.rows[0];

      if (!dbUser) {
        console.error('User not found in database for auth_id:', user.id);
        return res.status(404).json({
          message: 'User account not found. Please contact support.',
          code: 'USER_NOT_FOUND',
        });
      }

      console.log('✅ Database user found:', dbUser.username);
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      return res.status(500).json({
        message: 'Error retrieving user data',
        code: 'DATABASE_ERROR',
      });
    }

    // Attach the user information to the request object
    req.user = {
      userId: dbUser.user_id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      subscriptionType: dbUser.subscription_type,
      authId: user.id,
      // Add the full Supabase user object for additional context if needed
      supabaseUser: user,
    };

    // Add the Supabase client to the request for potential later use
    req.supabase = supabaseClient;

    console.log('✅ Authentication middleware completed successfully');
    next();
  } catch (error) {
    console.error('Unexpected auth middleware error:', error);
    return res.status(500).json({
      message: 'Internal authentication error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// Enhanced middleware that handles session refresh automatically
const authSupabaseWithRefresh = async (req, res, next) => {
  try {
    // Get the token from the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        message: 'Authentication token required',
        code: 'TOKEN_REQUIRED',
      });
    }

    console.log('🔍 Validating token with refresh capability');

    // First try to validate the token
    let {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);

    // If token is expired, try to get a fresh session
    if (error && error.message.includes('expired')) {
      console.log('🔄 Token expired, checking for valid session...');

      // Try to get the current session (this might trigger a refresh)
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError || !session) {
        console.error('Session refresh failed:', sessionError);
        return res.status(401).json({
          message: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED',
        });
      }

      // Validate the refreshed token
      const {
        data: { user: refreshedUser },
        error: refreshError,
      } = await supabaseClient.auth.getUser(session.access_token);

      if (refreshError || !refreshedUser) {
        console.error('Refreshed token validation failed:', refreshError);
        return res.status(401).json({
          message: 'Session validation failed. Please login again.',
          code: 'SESSION_INVALID',
        });
      }

      user = refreshedUser;
      console.log('✅ Token refreshed and validated successfully');

      // Optionally, you can add the new token to the response headers
      // so the client can update its stored token
      res.setHeader('X-New-Access-Token', session.access_token);
    } else if (error) {
      console.error('Supabase token validation error:', error);
      return res.status(401).json({
        message: 'Authentication failed',
        code: 'AUTH_FAILED',
      });
    }

    if (!user) {
      return res.status(401).json({
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      });
    }

    console.log('✅ Token validated for user:', user.email);

    // Get the user from our database using auth_id
    const query = `
      SELECT user_id, username, email, role, subscription_type, auth_id
      FROM users 
      WHERE auth_id = $1
    `;

    let dbUser;
    try {
      const result = await db.query(query, [user.id]);
      dbUser = result.rows[0];

      if (!dbUser) {
        console.error('User not found in database for auth_id:', user.id);
        return res.status(404).json({
          message: 'User account not found. Please contact support.',
          code: 'USER_NOT_FOUND',
        });
      }

      console.log('✅ Database user found:', dbUser.username);
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      return res.status(500).json({
        message: 'Error retrieving user data',
        code: 'DATABASE_ERROR',
      });
    }

    // Attach the user information to the request object
    req.user = {
      userId: dbUser.user_id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      subscriptionType: dbUser.subscription_type,
      authId: user.id,
      supabaseUser: user,
    };

    req.supabase = supabaseClient;

    console.log('✅ Enhanced authentication middleware completed successfully');
    next();
  } catch (error) {
    console.error('Unexpected enhanced auth middleware error:', error);
    return res.status(500).json({
      message: 'Internal authentication error',
      code: 'INTERNAL_ERROR',
    });
  }
};

// Optional: Middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
  }
  next();
};

// Optional: Middleware for specific subscription types
const requireSubscription = (requiredType) => {
  return (req, res, next) => {
    if (!req.user || req.user.subscriptionType !== requiredType) {
      return res.status(403).json({
        message: `${requiredType} subscription required`,
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }
    next();
  };
};

module.exports = {
  default: authSupabaseMiddleware,
  authSupabase: authSupabaseMiddleware,
  authSupabaseWithRefresh,
  requireAdmin,
  requireSubscription,
};
