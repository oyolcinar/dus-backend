const db = require('../config/db');

const friendModel = {
  // Send friend request
  async sendRequest(userId, friendId) {
    const query = `
      INSERT INTO user_friends (user_id, friend_id, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT (user_id, friend_id) DO NOTHING
      RETURNING friendship_id, user_id, friend_id, status, created_at
    `;

    const values = [userId, friendId];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Accept friend request
  async acceptRequest(userId, friendId) {
    const query = `
      UPDATE user_friends
      SET status = 'accepted'
      WHERE user_id = $2 AND friend_id = $1 AND status = 'pending'
      RETURNING friendship_id, user_id, friend_id, status, created_at
    `;

    // Create reverse relationship
    const reverseQuery = `
      INSERT INTO user_friends (user_id, friend_id, status)
      VALUES ($1, $2, 'accepted')
      ON CONFLICT (user_id, friend_id) DO NOTHING
    `;

    const values = [userId, friendId];
    const result = await db.query(query, values);

    if (result.rows[0]) {
      await db.query(reverseQuery, values);
    }

    return result.rows[0];
  },

  // Reject friend request
  async rejectRequest(userId, friendId) {
    const query = `
      UPDATE user_friends
      SET status = 'rejected'
      WHERE user_id = $2 AND friend_id = $1 AND status = 'pending'
      RETURNING friendship_id, user_id, friend_id, status, created_at
    `;

    const values = [userId, friendId];
    const result = await db.query(query, values);

    return result.rows[0];
  },

  // Get user's friends
  async getUserFriends(userId) {
    const query = `
      SELECT f.friendship_id, f.user_id, f.friend_id, f.status, f.created_at,
             u.username as friend_username, u.email as friend_email
      FROM user_friends f
      JOIN users u ON f.friend_id = u.user_id
      WHERE f.user_id = $1 AND f.status = 'accepted'
      ORDER BY u.username
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Get pending friend requests
  async getPendingRequests(userId) {
    const query = `
      SELECT f.friendship_id, f.user_id, f.friend_id, f.status, f.created_at,
             u.username as requester_username, u.email as requester_email
      FROM user_friends f
      JOIN users u ON f.user_id = u.user_id
      WHERE f.friend_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  },

  // Remove friend
  async removeFriend(userId, friendId) {
    const query = `
      DELETE FROM user_friends
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
      RETURNING friendship_id
    `;

    const values = [userId, friendId];
    const result = await db.query(query, values);

    return result.rows.length > 0;
  },
};

module.exports = friendModel;
