const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const friendModel = {
  // Send friend request
  async sendRequest(userId, friendId) {
    try {
      // First check if this request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('user_friends')
        .select('*')
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .single();

      if (!checkError && existingRequest) {
        // Request already exists, return it
        return existingRequest;
      }

      // Insert new friend request
      const { data, error } = await supabase
        .from('user_friends')
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  // Accept friend request
  async acceptRequest(userId, friendId) {
    try {
      // First update the request to accepted
      const { data, error } = await supabase
        .from('user_friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', userId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // If no request was found
      if (!data) {
        return null;
      }

      // Create reverse relationship as accepted
      const { data: reverseData, error: reverseError } = await supabase
        .from('user_friends')
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: 'accepted',
        })
        .select()
        .single();

      if (reverseError) throw reverseError;

      return data;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  },

  // Reject friend request
  async rejectRequest(userId, friendId) {
    try {
      const { data, error } = await supabase
        .from('user_friends')
        .update({ status: 'rejected' })
        .eq('user_id', friendId)
        .eq('friend_id', userId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  },

  // Get user's friends
  async getUserFriends(userId) {
    try {
      // First get all friendships for this user with status 'accepted'
      const { data: friendships, error } = await supabase
        .from('user_friends')
        .select('friendship_id, user_id, friend_id, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;

      if (!friendships || friendships.length === 0) {
        return [];
      }

      // Get the friend details for each friendship
      const friendIds = friendships.map((f) => f.friend_id);

      const { data: friendUsers, error: usersError } = await supabase
        .from('users')
        .select('user_id, username, email')
        .in('user_id', friendIds);

      if (usersError) throw usersError;

      // Combine the friendship and user data
      return friendships
        .map((friendship) => {
          const friendUser = friendUsers.find(
            (u) => u.user_id === friendship.friend_id,
          );
          return {
            ...friendship,
            friend_username: friendUser?.username,
            friend_email: friendUser?.email,
          };
        })
        .sort(
          (a, b) => a.friend_username?.localeCompare(b.friend_username) || 0,
        );
    } catch (error) {
      console.error('Error getting user friends:', error);
      throw error;
    }
  },

  // Get pending friend requests
  async getPendingRequests(userId) {
    try {
      // Get all pending requests where this user is the friend_id
      const { data: pendingRequests, error } = await supabase
        .from('user_friends')
        .select('friendship_id, user_id, friend_id, status, created_at')
        .eq('friend_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!pendingRequests || pendingRequests.length === 0) {
        return [];
      }

      // Get the requester details for each pending request
      const requesterIds = pendingRequests.map((r) => r.user_id);

      const { data: requesterUsers, error: usersError } = await supabase
        .from('users')
        .select('user_id, username, email')
        .in('user_id', requesterIds);

      if (usersError) throw usersError;

      // Combine the request and user data
      return pendingRequests.map((request) => {
        const requester = requesterUsers.find(
          (u) => u.user_id === request.user_id,
        );
        return {
          ...request,
          requester_username: requester?.username,
          requester_email: requester?.email,
        };
      });
    } catch (error) {
      console.error('Error getting pending friend requests:', error);
      throw error;
    }
  },

  // Remove friend
  async removeFriend(userId, friendId) {
    try {
      // Delete both directions of the friendship
      const { data, error } = await supabase
        .from('user_friends')
        .delete()
        .or(
          `(user_id.eq.${userId}).and(friend_id.eq.${friendId}), (user_id.eq.${friendId}).and(friend_id.eq.${userId})`,
        )
        .select();

      if (error) throw error;

      // Return true if at least one record was deleted
      return data && data.length > 0;
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  },

  // Check friendship status
  async getFriendshipStatus(userId, friendId) {
    try {
      // Check direct relationship
      const { data: direct, error: directError } = await supabase
        .from('user_friends')
        .select('status')
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .single();

      if (directError && directError.code !== 'PGRST116') throw directError;

      if (direct) {
        return direct.status;
      }

      // Check reverse relationship
      const { data: reverse, error: reverseError } = await supabase
        .from('user_friends')
        .select('status')
        .eq('user_id', friendId)
        .eq('friend_id', userId)
        .single();

      if (reverseError && reverseError.code !== 'PGRST116') throw reverseError;

      if (reverse) {
        // If the other person sent a request to this user
        if (reverse.status === 'pending') {
          return 'incoming_request';
        }
        return reverse.status;
      }

      // No relationship found
      return 'none';
    } catch (error) {
      console.error('Error checking friendship status:', error);
      throw error;
    }
  },
};

module.exports = friendModel;
