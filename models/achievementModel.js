const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

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

  // Get user's achievements
  async getUserAchievements(userId) {
    try {
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

      if (error) throw error;

      // Transform the nested data to match the format of the original response
      return data.map((item) => ({
        achievement_id: item.achievements.achievement_id,
        name: item.achievements.name,
        description: item.achievements.description,
        requirements: item.achievements.requirements,
        date_earned: item.date_earned,
      }));
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
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
};

module.exports = achievementModel;
