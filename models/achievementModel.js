// Only making needed improvements to getUserAchievements while preserving everything else
const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
const notificationService = require('../services/notificationService');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const achievementModel = {
  // Create a new achievement
  async create(name, description, requirements) {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .insert({
          name,
          description,
          requirements,
        })
        .select('achievement_id, name, description, requirements, created_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating achievement:', error);
      throw error;
    }
  },

  // Get all achievements
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_id, name, description, requirements, created_at')
        .order('achievement_id', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting all achievements:', error);
      throw error;
    }
  },

  // Get achievement by ID
  async getById(achievementId) {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_id, name, description, requirements, created_at')
        .eq('achievement_id', achievementId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No achievement found
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting achievement by ID:', error);
      throw error;
    }
  },

  // Update achievement
  async update(achievementId, name, description, requirements) {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .update({
          name,
          description,
          requirements,
        })
        .eq('achievement_id', achievementId)
        .select('achievement_id, name, description, requirements, created_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating achievement:', error);
      throw error;
    }
  },

  // Delete achievement
  async delete(achievementId) {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .delete()
        .eq('achievement_id', achievementId)
        .select('achievement_id')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting achievement:', error);
      throw error;
    }
  },

  // Award achievement to user
  async awardToUser(userId, achievementId) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
        })
        .select('user_id, achievement_id, date_earned')
        .single();

      // If there's a conflict (user already has achievement), handle it
      if (error && error.code === '23505') {
        // Retrieve the existing record instead
        const { data: existingData, error: fetchError } = await supabase
          .from('user_achievements')
          .select('user_id, achievement_id, date_earned')
          .eq('user_id', userId)
          .eq('achievement_id', achievementId)
          .single();

        if (fetchError) throw fetchError;
        return existingData;
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error awarding achievement to user:', error);
      throw error;
    }
  },

  // Get user's achievements - IMPROVED WITH BETTER ERROR HANDLING
  async getUserAchievements(userId) {
    try {
      // Validate userId
      if (!userId) {
        console.error('User ID is required for getUserAchievements');
        return []; // Return empty array instead of throwing error
      }

      const { data, error } = await supabase
        .from('user_achievements')
        .select(
          `
          achievement_id,
          date_earned,
          achievements (
            achievement_id,
            name, 
            description,
            requirements
          )
        `,
        )
        .eq('user_id', userId)
        .order('date_earned', { ascending: false });

      if (error) {
        console.error('Supabase error in getUserAchievements:', error);
        return []; // Return empty array instead of failing
      }

      // Additional error handling for malformed data
      if (!data || !Array.isArray(data)) {
        console.error(
          'Unexpected response format from user_achievements query:',
          data,
        );
        return []; // Return empty array instead of failing
      }

      // Transform the nested data and handle missing/malformed achievements
      return data.map((item) => {
        if (!item.achievements) {
          console.warn(
            `Missing achievement data for user_achievement record: ${item.achievement_id}`,
          );
          return {
            achievement_id: item.achievement_id,
            name: 'Unknown Achievement',
            description: null,
            requirements: {},
            date_earned: item.date_earned,
          };
        }

        return {
          achievement_id: item.achievements.achievement_id,
          name: item.achievements.name,
          description: item.achievements.description,
          requirements: item.achievements.requirements,
          date_earned: item.date_earned,
        };
      });
    } catch (error) {
      console.error('Error getting user achievements:', error);
      // Return empty array for better frontend compatibility
      return [];
    }
  },

  // Check if user has achievement
  async userHasAchievement(userId, achievementId) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('user_id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId);

      if (error) throw error;
      return data.length > 0;
    } catch (error) {
      console.error('Error checking if user has achievement:', error);
      throw error;
    }
  },
  async awardToUserWithNotification(userId, achievementId) {
    try {
      // Use existing award function
      const userAchievement = await this.awardToUser(userId, achievementId);

      // Get achievement details for notification
      const achievement = await this.getById(achievementId);

      if (achievement) {
        // Send achievement notification
        await notificationService.sendNotification(
          userId,
          'achievement_unlock',
          'achievement_unlock',
          {
            achievement_name: achievement.name,
            achievement_id: achievementId,
          },
        );
      }

      return userAchievement;
    } catch (error) {
      console.error('Error awarding achievement with notification:', error);
      throw error;
    }
  },
};

module.exports = achievementModel;
