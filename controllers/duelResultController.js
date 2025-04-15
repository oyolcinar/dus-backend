const duelResultModel = require('../models/duelResultModel');
const duelModel = require('../models/duelModel');
const userModel = require('../models/userModel');

const duelResultController = {
  // Record duel result
  async create(req, res) {
    try {
      const { duelId, winnerId, initiatorScore, opponentScore } = req.body;

      // Validate input
      if (
        !duelId ||
        initiatorScore === undefined ||
        opponentScore === undefined
      ) {
        return res
          .status(400)
          .json({
            message:
              'Duel ID, initiator score, and opponent score are required',
          });
      }

      // Check if duel exists
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }

      // Check if duel is active
      if (duel.status !== 'active') {
        return res
          .status(400)
          .json({ message: 'Only active duels can have results recorded' });
      }

      // Check if winner exists (if provided)
      if (winnerId) {
        const winner = await userModel.findById(winnerId);
        if (!winner) {
          return res.status(404).json({ message: 'Winner not found' });
        }

        // Verify winner is a participant
        if (winnerId !== duel.initiator_id && winnerId !== duel.opponent_id) {
          return res
            .status(400)
            .json({ message: 'Winner must be a duel participant' });
        }
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

      // Update user statistics
      if (winnerId) {
        // Winner stats
        await userModel.updateDuelStats(winnerId, true);

        // Loser stats
        const loserId =
          winnerId === duel.initiator_id ? duel.opponent_id : duel.initiator_id;
        await userModel.updateDuelStats(loserId, false);
      } else {
        // Draw - both get a "participation" stat
        await userModel.updateDuelStats(duel.initiator_id, null);
        await userModel.updateDuelStats(duel.opponent_id, null);
      }

      res.status(201).json({
        message: 'Duel result recorded successfully',
        result,
      });
    } catch (error) {
      console.error('Record duel result error:', error);
      res.status(500).json({ message: 'Failed to record duel result' });
    }
  },

  // Get result by duel ID
  async getByDuelId(req, res) {
    try {
      const duelId = req.params.duelId;

      // Check if duel exists
      const duel = await duelModel.getById(duelId);
      if (!duel) {
        return res.status(404).json({ message: 'Duel not found' });
      }

      // Get result
      const result = await duelResultModel.getByDuelId(duelId);
      if (!result) {
        return res.status(404).json({ message: 'Duel result not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Get duel result error:', error);
      res.status(500).json({ message: 'Failed to retrieve duel result' });
    }
  },

  // Get user's duel statistics
  async getUserStats(req, res) {
    try {
      const userId = req.params.userId || req.user.userId;

      // Check if user exists
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get statistics
      const stats = await duelResultModel.getUserStats(userId);

      res.json({
        userId,
        wins: parseInt(stats.wins) || 0,
        losses: parseInt(stats.losses) || 0,
        totalDuels: parseInt(stats.wins) + parseInt(stats.losses) || 0,
        winRate:
          stats.wins > 0
            ? (
                (parseInt(stats.wins) /
                  (parseInt(stats.wins) + parseInt(stats.losses))) *
                100
              ).toFixed(2)
            : 0,
        averageScore: parseFloat(stats.avg_score).toFixed(2) || 0,
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ message: 'Failed to retrieve user statistics' });
    }
  },
};

module.exports = duelResultController;
