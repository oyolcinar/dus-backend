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
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get the user from our database using auth_id
    const query = `
      SELECT user_id, username, email, role, subscription_type 
      FROM users 
      WHERE auth_id = $1
    `;

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

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = authSupabaseMiddleware;
