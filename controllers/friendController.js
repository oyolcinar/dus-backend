const friendModel = require('../models/friendModel');
const userModel = require('../models/userModel');

const friendController = {
  // Send friend request
  async sendRequest(req, res) {
    try {
      const userId = req.user.userId;
      const { friendId } = req.body;

      // Validate input
      if (!friendId) {
        return res.status(400).json({ message: 'Friend ID is required' });
      }

      // Prevent sending request to yourself
      if (userId === parseInt(friendId)) {
        return res
          .status(400)
          .json({ message: 'You cannot send a friend request to yourself' });
      }

      // Check if friend exists
      const friend = await userModel.findById(friendId);
      if (!friend) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Send request
      const request = await friendModel.sendRequest(userId, friendId);

      res.status(201).json({
        message: 'Friend request sent successfully',
        request,
      });
    } catch (error) {
      console.error('Send friend request error:', error);
      res.status(500).json({ message: 'Failed to send friend request' });
    }
  },

  // Accept friend request
  async acceptRequest(req, res) {
    try {
      const userId = req.user.userId;
      const { friendId } = req.params;

      // Accept request
      const result = await friendModel.acceptRequest(userId, friendId);
      if (!result) {
        return res.status(404).json({ message: 'Friend request not found' });
      }

      res.json({ message: 'Friend request accepted successfully' });
    } catch (error) {
      console.error('Accept friend request error:', error);
      res.status(500).json({ message: 'Failed to accept friend request' });
    }
  },

  // Reject friend request
  async rejectRequest(req, res) {
    try {
      const userId = req.user.userId;
      const { friendId } = req.params;

      // Reject request
      const result = await friendModel.rejectRequest(userId, friendId);
      if (!result) {
        return res.status(404).json({ message: 'Friend request not found' });
      }

      res.json({ message: 'Friend request rejected successfully' });
    } catch (error) {
      console.error('Reject friend request error:', error);
      res.status(500).json({ message: 'Failed to reject friend request' });
    }
  },

  // Get user's friends
  async getUserFriends(req, res) {
    try {
      const userId = req.user.userId;

      const friends = await friendModel.getUserFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error('Get friends error:', error);
      res.status(500).json({ message: 'Failed to retrieve friends' });
    }
  },

  // Get pending friend requests
  async getPendingRequests(req, res) {
    try {
      const userId = req.user.userId;

      const requests = await friendModel.getPendingRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error('Get pending requests error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve pending friend requests' });
    }
  },

  // Remove friend
  async removeFriend(req, res) {
    try {
      const userId = req.user.userId;
      const { friendId } = req.params;

      const result = await friendModel.removeFriend(userId, friendId);
      if (!result) {
        return res.status(404).json({ message: 'Friend not found' });
      }

      res.json({ message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(500).json({ message: 'Failed to remove friend' });
    }
  },
};

module.exports = friendController;
