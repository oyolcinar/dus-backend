const db = require('../config/db'); // Keeping for backward compatibility
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const subscriptionModel = {
  // Create a new subscription
  async create(
    userId,
    subscriptionType,
    startDate,
    endDate,
    paymentReference,
    amount,
  ) {
    try {
      // Insert new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          subscription_type: subscriptionType,
          start_date: startDate,
          end_date: endDate,
          payment_reference: paymentReference,
          amount: amount,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Update user's subscription type
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ subscription_type: subscriptionType })
        .eq('user_id', userId);

      if (userUpdateError) throw userUpdateError;

      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  },

  // Get user's active subscription
  async getActiveSubscription(userId) {
    try {
      const currentDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('end_date', currentDate)
        .order('end_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting active subscription:', error);
      throw error;
    }
  },

  // Get user's subscription history
  async getUserSubscriptions(userId) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      throw error;
    }
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    try {
      // First get the subscription to get the user_id
      const { data: subscription, error: getError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('subscription_id', subscriptionId)
        .single();

      if (getError) throw getError;
      if (!subscription) return null;

      // Update subscription to inactive
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('subscription_id', subscriptionId)
        .select('*')
        .single();

      if (error) throw error;

      // Check if user has any other active subscriptions
      const userId = subscription.user_id;
      const activeSubscription = await this.getActiveSubscription(userId);

      // If no more active subscriptions, revert user to free
      if (!activeSubscription) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ subscription_type: 'free' })
          .eq('user_id', userId);

        if (userUpdateError) throw userUpdateError;
      }

      return data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  },
};

module.exports = subscriptionModel;
