/**
 * Middleware for authentication with Supabase
 * This handles JWT validation and user verification
 */
const { supabaseUrl, supabaseKey } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const db = require('../config/db');

const authSupabaseMiddleware = async (req, res, next) => {
  try {
    // Get the token from the authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Create a Supabase client with the token
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Enhanced error logging
      if (error) {
        console.error('Supabase token validation error:', error);
      }
      return res
        .status(401)
        .json({ message: 'Session expired. Please login again.' });
    }

    // Get the user from our database using auth_id
    const query = `
      SELECT user_id, username, email, role, subscription_type 
      FROM users 
      WHERE auth_id = $1
    `;

    try {
      const result = await db.query(query, [user.id]);
      const dbUser = result.rows[0];

      if (!dbUser) {
        return res.status(404).json({
          message:
            'User account not found. Auth verified but user mapping missing.',
        });
      }

      // Attach the user information to the request object
      req.user = {
        userId: dbUser.user_id,
        email: dbUser.email,
        role: dbUser.role,
        subscriptionType: dbUser.subscription_type,
        authId: user.id,
      };

      // Add the Supabase instance to the request for potential later use
      req.supabase = supabase;

      next();
    } catch (dbError) {
      // Better database error handling
      console.error('Database error during authentication:', dbError);
      return res.status(500).json({
        message: 'Error retrieving user data from database',
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = authSupabaseMiddleware;
