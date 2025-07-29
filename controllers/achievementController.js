const achievementModel = require('../models/achievementModel');
const achievementService = require('../services/achievementService'); // Add this import
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

const achievementController = {
  // Create a new achievement (admin only)
  async create(req, res) {
    try {
      const { name, description, requirements } = req.body;

      // Validate input
      if (!name || !requirements) {
        return res
          .status(400)
          .json({ message: 'Name and requirements are required' });
      }

      // Create achievement using the updated model
      const newAchievement = await achievementModel.create(
        name,
        description || null,
        requirements,
      );

      // Log the action for audit purposes
      console.log(
        `User ${req.user.userId} (${req.user.email}) created achievement: ${newAchievement.achievement_id}`,
      );

      res.status(201).json({
        message: 'Achievement created successfully',
        achievement: newAchievement,
      });
    } catch (error) {
      console.error('Achievement creation error:', error);
      res.status(500).json({ message: 'Failed to create achievement' });
    }
  },

  // Get all achievements
  async getAll(req, res) {
    try {
      const achievements = await achievementModel.getAll();
      res.json(achievements);
    } catch (error) {
      console.error('Get achievements error:', error);
      res.status(500).json({ message: 'Failed to retrieve achievements' });
    }
  },

  // Get achievement by ID
  async getById(req, res) {
    try {
      const achievementId = req.params.id;

      const achievement = await achievementModel.getById(achievementId);
      if (!achievement) {
        return res.status(404).json({ message: 'Achievement not found' });
      }

      res.json(achievement);
    } catch (error) {
      console.error('Get achievement error:', error);
      res.status(500).json({ message: 'Failed to retrieve achievement' });
    }
  },

  // Update achievement (admin only)
  async update(req, res) {
    try {
      const achievementId = req.params.id;
      const { name, description, requirements } = req.body;

      // Check if achievement exists
      const existingAchievement = await achievementModel.getById(achievementId);
      if (!existingAchievement) {
        return res.status(404).json({ message: 'Achievement not found' });
      }

      // Update achievement
      const updatedAchievement = await achievementModel.update(
        achievementId,
        name || existingAchievement.name,
        description !== undefined
          ? description
          : existingAchievement.description,
        requirements || existingAchievement.requirements,
      );

      // Log the action for audit purposes
      console.log(
        `User ${req.user.userId} (${req.user.email}) updated achievement: ${achievementId}`,
      );

      res.json({
        message: 'Achievement updated successfully',
        achievement: updatedAchievement,
      });
    } catch (error) {
      console.error('Update achievement error:', error);
      res.status(500).json({ message: 'Failed to update achievement' });
    }
  },

  // Delete achievement (admin only)
  async delete(req, res) {
    try {
      const achievementId = req.params.id;

      // Check if achievement exists
      const existingAchievement = await achievementModel.getById(achievementId);
      if (!existingAchievement) {
        return res.status(404).json({ message: 'Achievement not found' });
      }

      // Delete achievement
      await achievementModel.delete(achievementId);

      // Log the action for audit purposes
      console.log(
        `User ${req.user.userId} (${req.user.email}) deleted achievement: ${achievementId}`,
      );

      res.json({ message: 'Achievement deleted successfully' });
    } catch (error) {
      console.error('Delete achievement error:', error);
      res.status(500).json({ message: 'Failed to delete achievement' });
    }
  },

  // Award achievement to user (admin only)
  async awardAchievement(req, res) {
    try {
      const { userId, achievementId } = req.body;

      // Validate input
      if (!userId || !achievementId) {
        return res
          .status(400)
          .json({ message: 'User ID and achievement ID are required' });
      }

      // Initialize Supabase client to validate user exists
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check if achievement exists
      const achievement = await achievementModel.getById(achievementId);
      if (!achievement) {
        return res.status(404).json({ message: 'Achievement not found' });
      }

      // Check if user exists (via Supabase)
      try {
        const { data: userExists, error } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_id', userId)
          .single();

        if (error || !userExists) {
          return res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Supabase user check error:', error);
        // Continue with the process even if Supabase check fails as we have our own database
      }

      // Award achievement with notification
      await achievementModel.awardToUserWithNotification(userId, achievementId);

      // Log the action for audit purposes
      console.log(
        `User ${req.user.userId} (${req.user.email}) awarded achievement ${achievementId} to user ${userId}`,
      );

      res.json({ message: 'Achievement awarded successfully' });
    } catch (error) {
      console.error('Award achievement error:', error);
      res.status(500).json({ message: 'Failed to award achievement' });
    }
  },

  // Get user's achievements
  async getUserAchievements(req, res) {
    try {
      const userId = req.user.userId;
      const achievements = await achievementModel.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error('Get user achievements error:', error);
      res.status(500).json({ message: 'Failed to retrieve user achievements' });
    }
  },

  // NEW: Get user's achievement progress
  async getUserProgress(req, res) {
    try {
      const userId = req.user.userId;
      const progress = await achievementService.getUserAchievementProgress(
        userId,
      );

      res.json({
        message: 'Achievement progress retrieved successfully',
        progress: progress,
      });
    } catch (error) {
      console.error('Get user progress error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve achievement progress' });
    }
  },

  // NEW: Check user's achievements manually
  async checkUserAchievements(req, res) {
    try {
      const userId = req.user.userId;
      const newAchievements = await achievementService.checkUserAchievements(
        userId,
      );

      res.json({
        message: 'Achievement check completed',
        newAchievements: newAchievements.length,
        achievements: newAchievements.map((a) => ({
          id: a.achievement_id,
          name: a.name,
          description: a.description,
        })),
      });
    } catch (error) {
      console.error('Check user achievements error:', error);
      res.status(500).json({ message: 'Failed to check achievements' });
    }
  },

  // NEW: Get user statistics (admin or own data)
  async getUserStats(req, res) {
    try {
      const userId = req.params.userId || req.user.userId;

      // If requesting someone else's stats, check if user is admin
      if (userId !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const stats = await achievementService.getUserStats(userId);

      res.json({
        message: 'User statistics retrieved successfully',
        stats: stats,
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ message: 'Failed to retrieve user statistics' });
    }
  },

  // NEW: Bulk check achievements for multiple users (admin only)
  async bulkCheckAchievements(req, res) {
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: 'userIds array is required' });
      }

      const results = await achievementService.checkMultipleUsersAchievements(
        userIds,
      );

      const summary = {
        totalUsers: results.length,
        successfulChecks: results.filter((r) => r.success).length,
        failedChecks: results.filter((r) => !r.success).length,
        totalNewAchievements: results.reduce(
          (sum, r) => sum + r.newAchievements,
          0,
        ),
      };

      res.json({
        message: 'Bulk achievement check completed',
        summary: summary,
        results: results,
      });
    } catch (error) {
      console.error('Bulk check achievements error:', error);
      res
        .status(500)
        .json({ message: 'Failed to perform bulk achievement check' });
    }
  },

  // NEW: Check all users achievements (admin only)
  async checkAllUsersAchievements(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const results = await achievementService.checkAllUsersAchievements(limit);

      res.json({
        message: 'All users achievement check completed',
        summary: results.summary,
        sampleResults: results.results.slice(0, 10), // Return first 10 for brevity
      });
    } catch (error) {
      console.error('Check all users achievements error:', error);
      res
        .status(500)
        .json({ message: 'Failed to check all users achievements' });
    }
  },

  // NEW: Get leaderboard (top users by achievements)
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get users with most achievements
      const { data: leaderboard, error } = await supabase
        .from('user_achievements')
        .select(
          `
          user_id,
          users!inner(username),
          count:achievement_id.count()
        `,
        )
        .group('user_id, users.username')
        .order('count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      res.json({
        message: 'Leaderboard retrieved successfully',
        leaderboard: leaderboard,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ message: 'Failed to retrieve leaderboard' });
    }
  },

  // NEW: Trigger achievement check after specific action
  async triggerAchievementCheck(req, res) {
    try {
      const { actionType } = req.body;
      const userId = req.user.userId;

      if (!actionType) {
        return res.status(400).json({ message: 'actionType is required' });
      }

      const newAchievements = await achievementService.triggerAchievementCheck(
        userId,
        actionType,
      );

      res.json({
        message: `Achievement check triggered for ${actionType}`,
        newAchievements: newAchievements.length,
        achievements: newAchievements.map((a) => ({
          id: a.achievement_id,
          name: a.name,
          description: a.description,
        })),
      });
    } catch (error) {
      console.error('Trigger achievement check error:', error);
      res.status(500).json({ message: 'Failed to trigger achievement check' });
    }
  },

  // NEW: Get achievement statistics (admin only)
  async getAchievementStats(req, res) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get total achievements
      const { count: totalAchievements, error: achievementError } =
        await supabase
          .from('achievements')
          .select('*', { count: 'exact', head: true });

      if (achievementError) throw achievementError;

      // Get total user achievements
      const { count: totalUserAchievements, error: userAchievementError } =
        await supabase
          .from('user_achievements')
          .select('*', { count: 'exact', head: true });

      if (userAchievementError) throw userAchievementError;

      // Get achievement distribution
      const { data: distribution, error: distributionError } = await supabase
        .from('user_achievements')
        .select(
          `
          achievement_id,
          achievements!inner(name),
          count:user_id.count()
        `,
        )
        .group('achievement_id, achievements.name')
        .order('count', { ascending: false });

      if (distributionError) throw distributionError;

      // Get recent achievements (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentAchievements, error: recentError } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .gte('date_earned', sevenDaysAgo.toISOString());

      if (recentError) throw recentError;

      res.json({
        message: 'Achievement statistics retrieved successfully',
        stats: {
          totalAchievements: totalAchievements,
          totalUserAchievements: totalUserAchievements,
          recentAchievements: recentAchievements,
          averageAchievementsPerUser:
            totalUserAchievements > 0
              ? Math.round((totalUserAchievements / totalAchievements) * 100) /
                100
              : 0,
          distribution: distribution,
        },
      });
    } catch (error) {
      console.error('Get achievement stats error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve achievement statistics' });
    }
  },
};

module.exports = achievementController;
