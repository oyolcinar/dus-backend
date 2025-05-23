const duelModel = require('../models/duelModel');
const duelResultModel = require('../models/duelResultModel');
const userModel = require('../models/userModel');
const testModel = require('../models/testModel');
const topicModel = require('../models/topicModel');

const duelController = {
  // Challenge a user to a duel
  async challenge(req, res) {
    try {
      const initiatorId = req.user.userId;
      let {
        opponentId,
        testId,
        questionCount,
        branchType,
        selectionType,
        branchId,
      } = req.body;

      // Validate input
      if (!opponentId || !testId) {
        return res
          .status(400)
          .json({ message: 'Opponent ID and test ID are required' });
      }

      // Ensure opponentId is a number for comparison
      opponentId = Number(opponentId);

      // Validate the conversion was successful
      if (isNaN(opponentId)) {
        return res.status(400).json({ message: 'Invalid opponent ID format' });
      }

      // Prevent challenging yourself
      if (initiatorId === opponentId) {
        return res
          .status(400)
          .json({ message: 'You cannot challenge yourself to a duel' });
      }

      // Check if opponent exists
      const opponent = await userModel.findById(opponentId);
      if (!opponent) {
        return res.status(404).json({ message: 'Opponent not found' });
      }

      // Check if test exists
      const test = await testModel.getById(testId);
      if (!test) {
        return res.status(404).json({ message: 'Test not found' });
      }

      // If branch is specified, check if it exists
      if (branchId) {
        const branch = await topicModel.getById(branchId);
        if (!branch) {
          return res.status(404).json({ message: 'Branch/Topic not found' });
        }
      }

      // Create duel challenge
      const newDuel = await duelModel.create(
        initiatorId,
        opponentId,
        testId,
        questionCount || 3,
        branchType || 'mixed',
        selectionType || 'random',
        branchId || null,
      );

      res.status(201).json({
        message: 'Duel challenge sent successfully',
        duel: newDuel,
      });
    } catch (error) {
      console.error('Duel challenge error:', error);
      res.status(500).json({ message: 'Failed to create duel challenge' });
    }
  },

  // Get pending duel challenges
  async getPendingChallenges(req, res) {
    try {
      const userId = req.user.userId;

      const pendingDuels = await duelModel.getPendingByUserId(userId);
      res.json(pendingDuels);
    } catch (error) {
      console.error('Get pending duels error:', error);
      res.status(500).json({ message: 'Failed to retrieve pending duels' });
    }
  },

  // Get active duels
  async getActiveDuels(req, res) {
    try {
      const userId = req.user.userId;

      const activeDuels = await duelModel.getActiveByUserId(userId);
      res.json(activeDuels);
    } catch (error) {
      console.error('Get active duels error:', error);
      res.status(500).json({ message: 'Failed to retrieve active duels' });
    }
  },

  // Get completed duels
  async getCompletedDuels(req, res) {
    try {
      const userId = req.user.userId;

      const completedDuels = await duelModel.getCompletedByUserId(userId);
      res.json(completedDuels);
    } catch (error) {
      console.error('Get completed duels error:', error);
      res.status(500).json({ message: 'Failed to retrieve completed duels' });
    }
  },

  // Get duel details
  async getDuelDetails(req, res) {
    try {
      const duelId = req.params.id;

      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }

      // If duel is completed, get results
      let result = null;
      if (duel.status === 'completed') {
        result = await duelResultModel.getByDuelId(duelId);
      }

      res.json({
        duel,
        result,
      });
    } catch (error) {
      console.error('Get duel details error:', error);
      res.status(500).json({ message: 'Failed to retrieve duel details' });
    }
  },

  // Accept a duel challenge
  async acceptChallenge(req, res) {
    try {
      const userId = req.user.userId;
      const duelId = req.params.id;

      // Get duel details
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }

      // Check if user is the opponent
      if (duel.opponent_id !== userId) {
        return res
          .status(403)
          .json({ message: 'Only the challenged user can accept the duel' });
      }

      // Check if duel is pending
      if (duel.status !== 'pending') {
        return res
          .status(400)
          .json({ message: 'This duel cannot be accepted' });
      }

      // Accept the duel
      const updatedDuel = await duelModel.accept(duelId);

      res.json({
        message: 'Duel accepted successfully',
        duel: updatedDuel,
      });
    } catch (error) {
      console.error('Accept duel error:', error);
      res.status(500).json({ message: 'Failed to accept duel' });
    }
  },

  // Decline a duel challenge
  async declineChallenge(req, res) {
    try {
      const userId = req.user.userId;
      const duelId = req.params.id;

      // Get duel details
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }

      // Check if user is the opponent
      if (duel.opponent_id !== userId) {
        return res
          .status(403)
          .json({ message: 'Only the challenged user can decline the duel' });
      }

      // Check if duel is pending
      if (duel.status !== 'pending') {
        return res
          .status(400)
          .json({ message: 'This duel cannot be declined' });
      }

      // Decline the duel
      await duelModel.decline(duelId);

      res.json({ message: 'Duel declined successfully' });
    } catch (error) {
      console.error('Decline duel error:', error);
      res.status(500).json({ message: 'Failed to decline duel' });
    }
  },

  // Submit duel result
  async submitResult(req, res) {
    try {
      const userId = req.user.userId;
      const duelId = req.params.id;
      const { initiatorScore, opponentScore } = req.body;

      // Validate input
      if (initiatorScore === undefined || opponentScore === undefined) {
        return res
          .status(400)
          .json({ message: 'Initiator score and opponent score are required' });
      }

      // Get duel details
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }

      // Check if user is a participant
      if (duel.initiator_id !== userId && duel.opponent_id !== userId) {
        return res
          .status(403)
          .json({ message: 'Only duel participants can submit results' });
      }

      // Check if duel is active
      if (duel.status !== 'active') {
        return res.status(400).json({ message: 'This duel is not active' });
      }

      // Determine winner
      let winnerId = null;
      if (initiatorScore > opponentScore) {
        winnerId = duel.initiator_id;
      } else if (opponentScore > initiatorScore) {
        winnerId = duel.opponent_id;
      }

      // Complete the duel
      await duelModel.complete(duelId);

      // Record result
      const result = await duelResultModel.create(
        duelId,
        winnerId,
        initiatorScore,
        opponentScore,
      );

      // Update user stats
      if (winnerId) {
        // Update winner stats
        await userModel.updateDuelStats(winnerId, true);

        // Update loser stats
        const loserId =
          winnerId === duel.initiator_id ? duel.opponent_id : duel.initiator_id;
        await userModel.updateDuelStats(loserId, false);
      } else {
        // Draw - update both participants
        await userModel.updateDuelStats(duel.initiator_id, null);
        await userModel.updateDuelStats(duel.opponent_id, null);
      }

      res.json({
        message: 'Duel result submitted successfully',
        result,
      });
    } catch (error) {
      console.error('Submit duel result error:', error);
      res.status(500).json({ message: 'Failed to submit duel result' });
    }
  },

  // Get duels by branch/topic
  async getDuelsByBranch(req, res) {
    try {
      const branchId = req.params.branchId;

      // Check if branch exists
      const branch = await topicModel.getById(branchId);
      if (!branch) {
        return res.status(404).json({ message: 'Branch/Topic not found' });
      }

      const duels = await duelModel.getByBranchId(branchId);
      res.json(duels);
    } catch (error) {
      console.error('Get duels by branch error:', error);
      res.status(500).json({ message: 'Failed to retrieve duels' });
    }
  },

  // Get user's duel statistics
  async getUserStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await userModel.getDuelStats(userId);

      // Handle potential missing data with default values
      const responseStats = {
        userId,
        totalDuels: stats?.total_duels ? parseInt(stats.total_duels) : 0,
        wins: stats?.duels_won ? parseInt(stats.duels_won) : 0,
        losses: stats?.duels_lost ? parseInt(stats.duels_lost) : 0,
        longestLosingStreak: stats?.longest_losing_streak
          ? parseInt(stats.longest_losing_streak)
          : 0,
        currentLosingStreak: stats?.current_losing_streak
          ? parseInt(stats.current_losing_streak)
          : 0,
        winRate: stats?.win_rate
          ? parseFloat(stats.win_rate).toFixed(2)
          : '0.00',
      };

      res.json(responseStats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ message: 'Failed to retrieve user statistics' });
    }
  },
};

module.exports = duelController;
