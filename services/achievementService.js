const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');
const achievementModel = require('../models/achievementModel');
const NotificationHelpers = require('./notificationHelpers');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

class AchievementService {
  // Check all achievements for a specific user
  async checkUserAchievements(userId) {
    try {
      console.log(`Checking achievements for user ${userId}`);

      // Get all achievements
      const achievements = await achievementModel.getAll();

      // Get user's current achievements
      const userAchievements = await achievementModel.getUserAchievements(
        userId,
      );
      const earnedAchievementIds = userAchievements.map(
        (ua) => ua.achievement_id,
      );

      const newlyEarned = [];

      for (const achievement of achievements) {
        // Skip if user already has this achievement
        if (earnedAchievementIds.includes(achievement.achievement_id)) {
          continue;
        }

        // Check if user meets requirements
        const meetsRequirements = await this.checkAchievementRequirements(
          userId,
          achievement.requirements,
        );

        if (meetsRequirements) {
          console.log(`User ${userId} earned achievement: ${achievement.name}`);

          // Award achievement with notification
          await achievementModel.awardToUserWithNotification(
            userId,
            achievement.achievement_id,
          );

          newlyEarned.push(achievement);
        }
      }

      return newlyEarned;
    } catch (error) {
      console.error('Error checking user achievements:', error);
      throw error;
    }
  }

  // Check if user meets specific achievement requirements
  async checkAchievementRequirements(userId, requirements) {
    try {
      if (!requirements || typeof requirements !== 'object') {
        return false;
      }

      // Get user analytics data
      const userStats = await this.getUserStats(userId);

      // Check each requirement
      for (const [requirementKey, requirementValue] of Object.entries(
        requirements,
      )) {
        const passes = await this.checkRequirement(
          requirementKey,
          requirementValue,
          userStats,
        );

        if (!passes) {
          return false; // All requirements must be met
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking achievement requirements:', error);
      return false;
    }
  }

  // Get comprehensive user statistics
  async getUserStats(userId) {
    try {
      // Get basic user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;

      // Get distinct study days count
      const { data: studySessions, error: studyError } = await supabase
        .from('user_topic_study_sessions')
        .select('session_date')
        .eq('user_id', userId);

      if (studyError) throw studyError;

      // Count distinct study days
      const distinctStudyDays = new Set(
        studySessions.map((session) => session.session_date),
      ).size;

      // Calculate total study time from sessions (in minutes)
      const { data: sessionDurations, error: durationError } = await supabase
        .from('user_topic_study_sessions')
        .select('duration_seconds')
        .eq('user_id', userId)
        .not('duration_seconds', 'is', null);

      if (durationError) throw durationError;

      const totalStudyTimeMinutes = sessionDurations.reduce(
        (total, session) => total + session.duration_seconds / 60,
        0,
      );

      // Get study streak data
      const studyStreak = await this.calculateStudyStreak(
        userId,
        studySessions,
      );

      // Check for weekly champion status (if implemented)
      const weeklyChampionCount = await this.getWeeklyChampionCount(userId);

      return {
        user_id: userId,
        date_registered: user.date_registered,
        total_duels: user.total_duels || 0,
        duels_won: user.duels_won || 0,
        duels_lost: user.duels_lost || 0,
        distinct_study_days: distinctStudyDays,
        total_study_time_minutes: Math.floor(totalStudyTimeMinutes),
        current_study_streak: studyStreak.current,
        longest_study_streak: studyStreak.longest,
        weekly_champion_count: weeklyChampionCount,
        user_registration: true, // User exists, so they're registered
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Calculate study streak from session dates
  calculateStudyStreak(userId, studySessions) {
    try {
      if (!studySessions || studySessions.length === 0) {
        return { current: 0, longest: 0 };
      }

      // Get unique dates and sort them
      const uniqueDates = [
        ...new Set(studySessions.map((s) => s.session_date)),
      ].sort((a, b) => new Date(b) - new Date(a)); // Most recent first

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;

      // Calculate current streak from most recent date
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        currentStreak = 1;

        for (let i = 1; i < uniqueDates.length; i++) {
          const currentDate = new Date(uniqueDates[i - 1]);
          const prevDate = new Date(uniqueDates[i]);
          const diffDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i - 1]);
        const prevDate = new Date(uniqueDates[i]);
        const diffDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      return {
        current: currentStreak,
        longest: Math.max(longestStreak, currentStreak),
      };
    } catch (error) {
      console.error('Error calculating study streak:', error);
      return { current: 0, longest: 0 };
    }
  }

  // Get weekly champion count (placeholder - implement based on your weekly champion logic)
  async getWeeklyChampionCount(userId) {
    try {
      // TODO: Implement weekly champion tracking
      // This would require a separate table/system to track weekly champions
      // For now, return 0 until you implement weekly champion functionality
      return 0;
    } catch (error) {
      console.error('Error getting weekly champion count:', error);
      return 0;
    }
  }

  // Check individual requirement
  async checkRequirement(requirementKey, requirementValue, userStats) {
    try {
      const userValue = userStats[requirementKey];

      if (requirementValue.required !== undefined) {
        // Boolean requirement (like user_registration)
        return userValue === requirementValue.required;
      }

      if (requirementValue.minimum !== undefined) {
        // Minimum value requirement
        return userValue >= requirementValue.minimum;
      }

      if (requirementValue.maximum !== undefined) {
        // Maximum value requirement
        return userValue <= requirementValue.maximum;
      }

      if (requirementValue.equals !== undefined) {
        // Exact value requirement
        return userValue === requirementValue.equals;
      }

      console.warn(
        `Unknown requirement format for ${requirementKey}:`,
        requirementValue,
      );
      return false;
    } catch (error) {
      console.error('Error checking individual requirement:', error);
      return false;
    }
  }

  // Check achievements for multiple users (for batch processing)
  async checkMultipleUsersAchievements(userIds) {
    try {
      const results = [];

      for (const userId of userIds) {
        try {
          const newAchievements = await this.checkUserAchievements(userId);
          results.push({
            userId,
            success: true,
            newAchievements: newAchievements.length,
            achievements: newAchievements.map((a) => ({
              id: a.achievement_id,
              name: a.name,
            })),
          });
        } catch (error) {
          console.error(
            `Error checking achievements for user ${userId}:`,
            error,
          );
          results.push({
            userId,
            success: false,
            error: error.message,
            newAchievements: 0,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error checking multiple users achievements:', error);
      throw error;
    }
  }

  // Check achievements for all active users (for cron job)
  async checkAllUsersAchievements(limit = 100) {
    try {
      console.log('Checking achievements for all users...');

      // Get all active users (you might want to add criteria like recent activity)
      const { data: users, error } = await supabase
        .from('users')
        .select('user_id')
        .order('user_id')
        .limit(limit);

      if (error) throw error;

      const userIds = users.map((u) => u.user_id);
      const results = await this.checkMultipleUsersAchievements(userIds);

      const summary = {
        totalUsers: results.length,
        successfulChecks: results.filter((r) => r.success).length,
        failedChecks: results.filter((r) => !r.success).length,
        totalNewAchievements: results.reduce(
          (sum, r) => sum + r.newAchievements,
          0,
        ),
      };

      console.log('Achievement check summary:', summary);
      return { results, summary };
    } catch (error) {
      console.error('Error checking all users achievements:', error);
      throw error;
    }
  }

  // Trigger achievement check after specific user actions
  async triggerAchievementCheck(userId, actionType) {
    try {
      console.log(
        `Triggering achievement check for user ${userId} after ${actionType}`,
      );

      // Different actions might trigger different achievement checks for optimization
      switch (actionType) {
        case 'study_session_completed':
          // Check study-related achievements
          return await this.checkUserAchievements(userId);

        case 'duel_completed':
          // Check duel-related achievements
          return await this.checkUserAchievements(userId);

        case 'user_registered':
          // Check registration achievement
          return await this.checkUserAchievements(userId);

        default:
          // Check all achievements
          return await this.checkUserAchievements(userId);
      }
    } catch (error) {
      console.error('Error triggering achievement check:', error);
      throw error;
    }
  }

  // Get user's progress towards unearned achievements
  async getUserAchievementProgress(userId) {
    try {
      const achievements = await achievementModel.getAll();
      const userAchievements = await achievementModel.getUserAchievements(
        userId,
      );
      const earnedAchievementIds = userAchievements.map(
        (ua) => ua.achievement_id,
      );
      const userStats = await this.getUserStats(userId);

      const progress = [];

      for (const achievement of achievements) {
        if (earnedAchievementIds.includes(achievement.achievement_id)) {
          continue; // Skip earned achievements
        }

        const requirementProgress = {};
        let overallProgress = 0;
        let totalRequirements = 0;

        if (
          achievement.requirements &&
          typeof achievement.requirements === 'object'
        ) {
          for (const [key, requirement] of Object.entries(
            achievement.requirements,
          )) {
            totalRequirements++;
            const userValue = userStats[key] || 0;

            if (requirement.minimum !== undefined) {
              const progressPercent = Math.min(
                (userValue / requirement.minimum) * 100,
                100,
              );
              requirementProgress[key] = {
                current: userValue,
                required: requirement.minimum,
                progress: Math.round(progressPercent),
              };
              overallProgress += progressPercent;
            } else if (requirement.required !== undefined) {
              const isComplete = userValue === requirement.required;
              requirementProgress[key] = {
                current: userValue,
                required: requirement.required,
                progress: isComplete ? 100 : 0,
              };
              overallProgress += isComplete ? 100 : 0;
            }
          }
        }

        progress.push({
          achievement_id: achievement.achievement_id,
          name: achievement.name,
          description: achievement.description,
          overall_progress:
            totalRequirements > 0
              ? Math.round(overallProgress / totalRequirements)
              : 0,
          requirements: requirementProgress,
        });
      }

      return progress;
    } catch (error) {
      console.error('Error getting user achievement progress:', error);
      throw error;
    }
  }
}

module.exports = new AchievementService();
