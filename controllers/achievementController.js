const achievementModel = require('../models/achievementModel');
const achievementService = require('../services/achievementService');
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

  // Get user's achievement progress
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

  // Check user's achievements manually
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

  // Get user statistics (admin or own data)
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

  // ✅ OPTIMIZED: Get course study metrics using database function
  async getCourseStudyMetrics(req, res) {
    try {
      const userId = req.user.userId;
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log(`Getting course study metrics for user: ${userId}`);

      // ✅ Use the new database function for better performance
      try {
        const { data: metricsData, error: functionError } = await supabase.rpc(
          'get_user_course_study_metrics',
          { target_user_id: userId },
        );

        if (!functionError && metricsData && metricsData.length > 0) {
          const metrics = metricsData[0];
          console.log(`Database function returned metrics:`, metrics);

          res.json({
            message: 'Course study metrics retrieved successfully',
            metrics: {
              total_courses_studied: metrics.total_courses_studied || 0,
              total_courses_completed: metrics.total_courses_completed || 0,
              total_course_study_time_seconds:
                metrics.total_course_study_time_seconds || 0,
              total_course_study_time_minutes:
                metrics.total_course_study_time_minutes || 0,
              total_course_sessions: metrics.total_course_sessions || 0,
              courses_by_type: metrics.courses_by_type || {},
              recent_courses: metrics.recent_courses || [],
            },
          });
          return;
        }
      } catch (dbFunctionError) {
        console.log(
          'Database function not available, falling back to manual query',
        );
      }

      // ✅ Fallback: Manual query if database function fails
      const { data: courseData, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          `
          course_id,
          courses!inner(title, course_type),
          study_duration_seconds,
          session_date,
          break_duration_seconds,
          total_duration_seconds
        `,
        )
        .eq('user_id', userId);

      if (error && error.code !== 'PGRST116') {
        console.error('Manual query error:', error);
        throw error;
      }

      // Calculate metrics from the found data
      const sessions = courseData || [];

      const metrics = {
        total_courses_studied: new Set(
          sessions.map((s) => s.course_id).filter(Boolean),
        ).size,
        total_courses_completed: 0, // Would need completion logic
        total_course_study_time_seconds: sessions.reduce((sum, s) => {
          const duration = s.study_duration_seconds || 0;
          return sum + duration;
        }, 0),
        total_course_study_time_minutes: Math.round(
          sessions.reduce((sum, s) => {
            const duration = s.study_duration_seconds || 0;
            return sum + duration;
          }, 0) / 60,
        ),
        total_course_sessions: sessions.length,
        courses_by_type: {},
        recent_courses: [],
      };

      // Group by course type
      const typeMap = new Map();
      sessions.forEach((session) => {
        const type = session.courses?.course_type || 'general';
        if (!typeMap.has(type)) {
          typeMap.set(type, { count: 0, total_time_minutes: 0 });
        }
        const typeData = typeMap.get(type);
        typeData.count += 1;
        const duration = session.study_duration_seconds || 0;
        typeData.total_time_minutes += Math.round(duration / 60);
      });

      metrics.courses_by_type = Object.fromEntries(typeMap);

      // Get recent courses (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      metrics.recent_courses = sessions
        .filter((s) => {
          if (!s.session_date) return false;
          const sessionDate = new Date(s.session_date);
          return sessionDate >= thirtyDaysAgo;
        })
        .reduce((unique, session) => {
          if (!unique.find((u) => u.course_id === session.course_id)) {
            unique.push({
              course_id: session.course_id,
              course_title:
                session.courses?.title || `Course ${session.course_id}`,
              last_studied: session.session_date,
            });
          }
          return unique;
        }, [])
        .slice(0, 10);

      console.log(
        `Manual metrics calculated: ${metrics.total_course_sessions} sessions, ${metrics.total_courses_studied} courses`,
      );

      res.json({
        message: 'Course study metrics retrieved successfully (manual)',
        metrics: metrics,
      });
    } catch (error) {
      console.error('Get course study metrics error:', error);

      // Return default/empty metrics to prevent frontend crashes
      const defaultMetrics = {
        total_courses_studied: 0,
        total_courses_completed: 0,
        total_course_study_time_seconds: 0,
        total_course_study_time_minutes: 0,
        total_course_sessions: 0,
        courses_by_type: {},
        recent_courses: [],
      };

      res.json({
        message: 'Course study metrics retrieved (default)',
        metrics: defaultMetrics,
      });
    }
  },

  // Bulk check achievements for multiple users (admin only)
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

  // Check all users achievements (admin only)
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

  // ✅ OPTIMIZED: Get leaderboard using database functions
  async getLeaderboard(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const supabase = createClient(supabaseUrl, supabaseKey);

      console.log(`Getting achievement leaderboard with limit: ${limit}`);

      // ✅ Try using the database function first (best performance)
      try {
        const { data: leaderboard, error: rpcError } = await supabase.rpc(
          'get_achievement_leaderboard',
          {
            result_limit: limit,
          },
        );

        if (!rpcError && leaderboard && leaderboard.length > 0) {
          console.log('✅ Leaderboard retrieved via RPC function');
          return res.json({
            message: 'Leaderboard retrieved successfully',
            leaderboard: leaderboard,
          });
        }
      } catch (rpcError) {
        console.log('RPC function not available, trying view fallback...');
      }

      // ✅ Fallback: Use view if available (good performance)
      try {
        const { data: leaderboard, error: viewError } = await supabase
          .from('achievement_leaderboard_view')
          .select('user_id, username, achievement_count')
          .limit(limit);

        if (!viewError && leaderboard && leaderboard.length > 0) {
          console.log('✅ Leaderboard retrieved via view');
          return res.json({
            message: 'Leaderboard retrieved successfully',
            leaderboard: leaderboard.map((item) => ({
              user_id: item.user_id,
              username: item.username,
              count: item.achievement_count,
            })),
          });
        }
      } catch (viewError) {
        console.log('View not available, using manual aggregation...');
      }

      // ✅ Final fallback: Manual aggregation (slower but works)
      const { data: userAchievements, error: manualError } =
        await supabase.from('user_achievements').select(`
          user_id,
          achievement_id,
          users!inner(username)
        `);

      if (manualError) {
        console.error('Manual query error:', manualError);
        throw manualError;
      }

      // Group and count manually
      const leaderboardMap = new Map();

      userAchievements.forEach((ua) => {
        const userId = ua.user_id;
        if (!leaderboardMap.has(userId)) {
          leaderboardMap.set(userId, {
            user_id: userId,
            username: ua.users.username,
            count: 0,
          });
        }
        leaderboardMap.get(userId).count += 1;
      });

      // Convert to array, sort, and limit
      const sortedLeaderboard = Array.from(leaderboardMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      console.log(
        `✅ Manual leaderboard calculated: ${sortedLeaderboard.length} entries`,
      );

      res.json({
        message: 'Leaderboard retrieved successfully',
        leaderboard: sortedLeaderboard,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);

      // Return empty leaderboard instead of error to prevent frontend crashes
      res.json({
        message: 'Leaderboard temporarily unavailable',
        leaderboard: [],
      });
    }
  },

  // Trigger achievement check after specific action
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

  // ✅ OPTIMIZED: Get achievement statistics using materialized view
  async getAchievementStats(req, res) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // ✅ Try using the materialized view first (best performance)
      try {
        const { data: statsFromView, error: viewError } = await supabase
          .from('achievement_stats_mv')
          .select('*')
          .single();

        if (!viewError && statsFromView) {
          console.log('✅ Achievement stats retrieved from materialized view');

          // Also get distribution data
          const { data: distribution, error: distError } = await supabase.from(
            'user_achievements',
          ).select(`
              achievement_id,
              achievements!inner(name)
            `);

          let distributionData = [];
          if (!distError && distribution) {
            const distributionMap = new Map();
            distribution.forEach((ua) => {
              const key = ua.achievement_id;
              const name = ua.achievements.name;
              if (!distributionMap.has(key)) {
                distributionMap.set(key, {
                  achievement_id: key,
                  name: name,
                  count: 0,
                });
              }
              distributionMap.get(key).count += 1;
            });

            distributionData = Array.from(distributionMap.values()).sort(
              (a, b) => b.count - a.count,
            );
          }

          return res.json({
            message: 'Achievement statistics retrieved successfully',
            stats: {
              totalAchievements: statsFromView.total_achievements,
              totalUserAchievements: statsFromView.total_user_achievements,
              recentAchievements: statsFromView.recent_achievements_7d,
              averageAchievementsPerUser: parseFloat(
                statsFromView.avg_achievements_per_user,
              ),
              distribution: distributionData,
            },
          });
        }
      } catch (viewError) {
        console.log(
          'Materialized view not available, using manual calculation...',
        );
      }

      // ✅ Fallback: Manual calculation
      const { count: totalAchievements, error: achievementError } =
        await supabase
          .from('achievements')
          .select('*', { count: 'exact', head: true });

      if (achievementError) throw achievementError;

      const { count: totalUserAchievements, error: userAchievementError } =
        await supabase
          .from('user_achievements')
          .select('*', { count: 'exact', head: true });

      if (userAchievementError) throw userAchievementError;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentAchievements, error: recentError } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true })
        .gte('date_earned', sevenDaysAgo.toISOString());

      if (recentError) throw recentError;

      res.json({
        message: 'Achievement statistics retrieved successfully (manual)',
        stats: {
          totalAchievements: totalAchievements,
          totalUserAchievements: totalUserAchievements,
          recentAchievements: recentAchievements,
          averageAchievementsPerUser:
            totalUserAchievements > 0 && totalAchievements > 0
              ? Math.round((totalUserAchievements / totalAchievements) * 100) /
                100
              : 0,
          distribution: [],
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
