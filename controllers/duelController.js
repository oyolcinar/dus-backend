const duelModel = require('../models/duelModel');
const duelResultModel = require('../models/duelResultModel');
const userModel = require('../models/userModel');
const testModel = require('../models/testModel');
const topicModel = require('../models/topicModel');
const courseModel = require('../models/courseModel');

const duelController = {
  // Challenge a user to a duel
  async challenge(req, res) {
    try {
      const initiatorId = req.user.userId;
      let {
        opponentId,
        testId, // Now optional
        courseId, // NEW: Course ID for new system
        questionCount,
        branchType,
        selectionType,
        branchId,
      } = req.body;

      if (!opponentId) {
        return res.status(400).json({ message: 'Opponent ID is required' });
      }

      // NEW: Either testId OR courseId must be provided
      if (!testId && !courseId) {
        return res
          .status(400)
          .json({ message: 'Either test ID or course ID is required' });
      }

      opponentId = Number(opponentId);

      if (isNaN(opponentId)) {
        return res.status(400).json({ message: 'Invalid opponent ID format' });
      }

      if (initiatorId === opponentId) {
        return res
          .status(400)
          .json({ message: 'You cannot challenge yourself to a duel' });
      }

      const opponent = await userModel.findById(opponentId);
      if (!opponent) {
        return res.status(404).json({ message: 'Opponent not found' });
      }

      // Validate test if provided (backward compatibility)
      if (testId) {
        const test = await testModel.getById(testId);
        if (!test) {
          return res.status(404).json({ message: 'Test not found' });
        }
      }

      // NEW: Validate course if provided
      if (courseId) {
        const course = await courseModel.getById(courseId);
        if (!course) {
          return res.status(404).json({ message: 'Course not found' });
        }
      }

      // Validate branch/topic if provided
      if (branchId) {
        const branch = await topicModel.getById(branchId);
        if (!branch) {
          return res.status(404).json({ message: 'Branch/Topic not found' });
        }
      }

      // NEW: Create duel with course support
      const newDuel = await duelModel.create(
        initiatorId,
        opponentId,
        testId || null,
        questionCount || 5, // Default to 5 questions
        branchType || 'mixed',
        selectionType || 'random',
        branchId || null,
        courseId || null, // NEW: Pass courseId
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
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }
      if (duel.opponent_id !== userId) {
        return res
          .status(403)
          .json({ message: 'Only the challenged user can accept the duel' });
      }
      if (duel.status !== 'pending') {
        return res
          .status(400)
          .json({ message: 'This duel cannot be accepted' });
      }
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
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }
      if (duel.opponent_id !== userId) {
        return res
          .status(403)
          .json({ message: 'Only the challenged user can decline the duel' });
      }
      if (duel.status !== 'pending') {
        return res
          .status(400)
          .json({ message: 'This duel cannot be declined' });
      }
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
      if (initiatorScore === undefined || opponentScore === undefined) {
        return res
          .status(400)
          .json({ message: 'Initiator score and opponent score are required' });
      }
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }
      if (duel.initiator_id !== userId && duel.opponent_id !== userId) {
        return res
          .status(403)
          .json({ message: 'Only duel participants can submit results' });
      }
      if (duel.status !== 'active') {
        return res.status(400).json({ message: 'This duel is not active' });
      }
      let winnerId = null;
      if (initiatorScore > opponentScore) {
        winnerId = duel.initiator_id;
      } else if (opponentScore > initiatorScore) {
        winnerId = duel.opponent_id;
      }
      await duelModel.complete(duelId);
      const result = await duelResultModel.create(
        duelId,
        winnerId,
        initiatorScore,
        opponentScore,
      );
      if (winnerId) {
        await userModel.updateDuelStats(winnerId, true);
        const loserId =
          winnerId === duel.initiator_id ? duel.opponent_id : duel.initiator_id;
        await userModel.updateDuelStats(loserId, false);
      } else {
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
      const responseStats = {
        userId,
        totalDuels: stats?.total_duels ? parseInt(stats.total_duels, 10) : 0,
        wins: stats?.duels_won ? parseInt(stats.duels_won, 10) : 0,
        losses: stats?.duels_lost ? parseInt(stats.duels_lost, 10) : 0,
        longestLosingStreak: stats?.longest_losing_streak
          ? parseInt(stats.longest_losing_streak, 10)
          : 0,
        currentLosingStreak: stats?.current_losing_streak
          ? parseInt(stats.current_losing_streak, 10)
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

  // --- NEW FUNCTIONS ADDED HERE ---

  /**
   * Get the duel leaderboard.
   */
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = parseInt(req.query.offset, 10) || 0;

      const leaderboardData = await duelModel.getLeaderboard(limit, offset);

      res.json({
        leaderboard: leaderboardData.users,
        total: leaderboardData.total,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ message: 'Failed to retrieve leaderboard' });
    }
  },

  /**
   * Get recommended opponents for the current user.
   */
  async getRecommendedOpponents(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit, 10) || 5;

      const opponents = await duelModel.getRecommendedOpponents(userId, limit);
      res.json(opponents);
    } catch (error) {
      console.error('Get recommended opponents error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve recommended opponents' });
    }
  },
};

module.exports = duelController;
