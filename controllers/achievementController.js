const achievementModel = require('../models/achievementModel');
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

      // Award achievement
      await achievementModel.awardToUser(userId, achievementId);

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
};

module.exports = achievementController;
