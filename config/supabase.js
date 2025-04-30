require('dotenv').config();

/**
 * Supabase client configuration
 *
 */
const supabaseUrl =
  process.env.SUPABASE_URL || 'https://xxazxnpffszqamaofgqw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin access

// Verify we have the environment variables
if (!supabaseKey) {
  console.warn(
    'WARNING: SUPABASE_SERVICE_KEY environment variable is not set!',
  );
}

// Export the Supabase URL and key for manual client creation
module.exports = {
  supabaseUrl,
  supabaseKey,
};
