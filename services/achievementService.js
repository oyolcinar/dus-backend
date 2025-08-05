const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');
const achievementModel = require('../models/achievementModel');
// REMOVED: NotificationHelpers import to fix circular dependency
// const NotificationHelpers = require('./notificationHelpers');

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

          // UPDATED: Award achievement with notification - USE DIRECT METHOD
          await this.awardAchievementWithNotification(userId, achievement);

          newlyEarned.push(achievement);
        }
      }

      return newlyEarned;
    } catch (error) {
      console.error('Error checking user achievements:', error);
      throw error;
    }
  }

  // NEW: Direct achievement notification method (avoids circular dependency)
  async awardAchievementWithNotification(userId, achievement) {
    try {
      // Award achievement to user first
      await achievementModel.awardToUser(userId, achievement.achievement_id);

      // Send achievement notification directly using notificationService
      const notificationService = require('./notificationService');

      await notificationService.sendNotification(
        userId,
        'achievement_unlock',
        'achievement_unlock',
        {
          achievement_name: achievement.name,
          achievement_id: achievement.achievement_id,
          achievement_description: achievement.description,
        },
      );

      console.log(
        `✅ Achievement "${achievement.name}" awarded to user ${userId} with notification`,
      );
    } catch (error) {
      console.error('Error awarding achievement with notification:', error);
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

  // UPDATED: Get comprehensive user statistics (COURSE-BASED)
  async getUserStats(userId) {
    try {
      console.log(
        `📊 Getting user stats for achievements (course-based) - User ${userId}`,
      );

      // Get basic user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;

      // UPDATED: Get course study sessions instead of topic sessions
      const { data: studySessions, error: studyError } = await supabase
        .from('user_course_study_sessions') // ✅ NEW TABLE
        .select('session_date, study_duration_seconds')
        .eq('user_id', userId)
        .eq('session_status', 'completed'); // Only completed sessions

      if (studyError) throw studyError;

      // Count distinct study days
      const distinctStudyDays = new Set(
        (studySessions || []).map((session) => session.session_date),
      ).size;

      // Calculate total study time from course sessions (in minutes)
      const totalStudyTimeMinutes = (studySessions || []).reduce(
        (total, session) => total + (session.study_duration_seconds || 0) / 60,
        0,
      );

      // UPDATED: Get study streak data from course sessions
      const studyStreak = await this.calculateStudyStreak(
        userId,
        studySessions || [],
      );

      // UPDATED: Get course-based statistics
      const { data: courseStats, error: courseStatsError } = await supabase
        .from('user_course_details')
        .select(
          'course_id, total_study_time_seconds, total_session_count, is_completed',
        )
        .eq('user_id', userId);

      if (courseStatsError) throw courseStatsError;

      // Calculate course-based metrics
      const coursesStudied = (courseStats || []).filter(
        (c) => c.total_study_time_seconds > 0,
      ).length;
      const coursesCompleted = (courseStats || []).filter(
        (c) => c.is_completed,
      ).length;
      const totalCourseStudyTime = (courseStats || []).reduce(
        (sum, c) => sum + (c.total_study_time_seconds || 0),
        0,
      );

      // Check for weekly champion status (if implemented)
      const weeklyChampionCount = await this.getWeeklyChampionCount(userId);

      const stats = {
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

        // NEW: Course-based metrics
        courses_studied: coursesStudied,
        courses_completed: coursesCompleted,
        total_course_study_time_seconds: totalCourseStudyTime,
        total_course_study_time_minutes: Math.floor(totalCourseStudyTime / 60),
        total_course_sessions: (courseStats || []).reduce(
          (sum, c) => sum + (c.total_session_count || 0),
          0,
        ),
      };

      console.log(`📈 Course-based user stats computed:`, {
        userId,
        distinctStudyDays,
        coursesStudied,
        coursesCompleted,
        totalStudyTimeMinutes: stats.total_study_time_minutes,
        currentStreak: studyStreak.current,
        longestStreak: studyStreak.longest,
      });

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // UPDATED: Calculate study streak from course session dates
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

      console.log(`🔥 Study streak calculated for user ${userId}:`, {
        current: currentStreak,
        longest: Math.max(longestStreak, currentStreak),
        totalStudyDays: uniqueDates.length,
      });

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
      // TODO: Implement weekly champion tracking based on course study performance
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
      console.log(
        '🔍 Checking achievements for all users (course-based system)...',
      );

      // UPDATED: Get all active users with recent course study activity
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

      console.log('🎯 Achievement check summary (course-based):', summary);
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
        `🎯 Triggering achievement check for user ${userId} after ${actionType} (course-based)`,
      );

      // Different actions might trigger different achievement checks for optimization
      switch (actionType) {
        case 'course_study_session_completed': // ✅ UPDATED
          // Check study-related achievements
          return await this.checkUserAchievements(userId);

        case 'course_completed': // ✅ NEW
          // Check course completion achievements
          return await this.checkUserAchievements(userId);

        case 'study_session_completed': // ✅ LEGACY SUPPORT
          // Legacy support - redirect to course-based
          console.log(
            '⚠️ Using legacy study_session_completed - redirecting to course-based',
          );
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

  // NEW: Manual achievement check for testing
  async manualAchievementCheck(userId) {
    try {
      console.log(
        `🧪 Manual achievement check for user ${userId} (course-based)`,
      );

      const newAchievements = await this.checkUserAchievements(userId);

      console.log(
        `🎯 Manual check complete: ${newAchievements.length} new achievements`,
      );
      return newAchievements;
    } catch (error) {
      console.error('Error in manual achievement check:', error);
      throw error;
    }
  }

  // NEW: Get achievement statistics
  async getAchievementStats() {
    try {
      // Get total achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('achievement_id');

      if (achievementsError) throw achievementsError;

      // Get total user achievements
      const { data: userAchievements, error: userAchievementsError } =
        await supabase
          .from('user_achievements')
          .select('achievement_id, user_id');

      if (userAchievementsError) throw userAchievementsError;

      // Calculate stats
      const totalAchievements = allAchievements.length;
      const totalAwarded = userAchievements.length;
      const uniqueUsersWithAchievements = new Set(
        userAchievements.map((ua) => ua.user_id),
      ).size;

      // Achievement distribution
      const achievementCounts = {};
      userAchievements.forEach((ua) => {
        achievementCounts[ua.achievement_id] =
          (achievementCounts[ua.achievement_id] || 0) + 1;
      });

      return {
        total_achievements: totalAchievements,
        total_awarded: totalAwarded,
        unique_users_with_achievements: uniqueUsersWithAchievements,
        average_achievements_per_user:
          uniqueUsersWithAchievements > 0
            ? Math.round((totalAwarded / uniqueUsersWithAchievements) * 100) /
              100
            : 0,
        achievement_distribution: achievementCounts,
      };
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      throw error;
    }
  }

  // NEW: Course-specific achievement helpers
  async checkCourseAchievements(userId, courseId) {
    try {
      console.log(
        `🎓 Checking course-specific achievements for user ${userId}, course ${courseId}`,
      );

      // Get course progress
      const { data: courseProgress, error } = await supabase
        .from('user_course_details')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!courseProgress) {
        console.log(
          `No course progress found for user ${userId}, course ${courseId}`,
        );
        return [];
      }

      // Trigger general achievement check which will include course-based metrics
      return await this.checkUserAchievements(userId);
    } catch (error) {
      console.error('Error checking course achievements:', error);
      throw error;
    }
  }

  // NEW: Get course study metrics for achievements
  async getCourseStudyMetrics(userId) {
    try {
      const { data: courseDetails, error } = await supabase
        .from('user_course_details')
        .select(
          `
          course_id,
          total_study_time_seconds,
          total_session_count,
          is_completed,
          completion_percentage,
          courses(title, course_type)
        `,
        )
        .eq('user_id', userId);

      if (error) throw error;

      const metrics = {
        total_courses_studied: (courseDetails || []).filter(
          (c) => c.total_study_time_seconds > 0,
        ).length,
        total_courses_completed: (courseDetails || []).filter(
          (c) => c.is_completed,
        ).length,
        total_study_time_all_courses: (courseDetails || []).reduce(
          (sum, c) => sum + (c.total_study_time_seconds || 0),
          0,
        ),
        course_types_studied: new Set(
          (courseDetails || [])
            .filter((c) => c.total_study_time_seconds > 0)
            .map((c) => c.courses?.course_type),
        ).size,
        average_completion_percentage:
          courseDetails?.length > 0
            ? (courseDetails || []).reduce(
                (sum, c) => sum + (c.completion_percentage || 0),
                0,
              ) / courseDetails.length
            : 0,
      };

      return metrics;
    } catch (error) {
      console.error('Error getting course study metrics:', error);
      throw error;
    }
  }
}

module.exports = new AchievementService();
