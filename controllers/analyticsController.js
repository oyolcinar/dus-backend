const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const analyticsController = {
  // ===============================
  // STREAK ANALYTICS
  // ===============================

  // Get user's longest streaks
  async getUserLongestStreaks(req, res) {
    try {
      const userId = req.user.userId;

      const { data: streaks, error } = await supabase.rpc(
        'get_user_longest_streaks',
        {
          p_user_id: userId,
        },
      );

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed longest streaks analytics`,
      );

      res.json({
        streaks: streaks || [],
      });
    } catch (error) {
      console.error('Get user longest streaks error:', error);
      res.status(500).json({ message: 'Failed to retrieve longest streaks' });
    }
  },

  // Get user streaks summary
  async getUserStreaksSummary(req, res) {
    try {
      const userId = req.user.userId;

      const { data: summary, error } = await supabase.rpc(
        'get_user_streaks_summary',
        {
          p_user_id: userId,
        },
      );

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed streaks summary analytics`,
      );

      res.json(summary || {});
    } catch (error) {
      console.error('Get user streaks summary error:', error);
      res.status(500).json({ message: 'Failed to retrieve streaks summary' });
    }
  },

  // ===============================
  // PROGRESS ANALYTICS
  // ===============================

  // Get user daily progress
  async getUserDailyProgress(req, res) {
    try {
      const userId = req.user.userId;
      const { startDate, endDate, days = 30 } = req.query;

      let start = startDate;
      let end = endDate;

      // If no dates provided, use last N days
      if (!start || !end) {
        const today = new Date();
        end = today.toISOString().split('T')[0];
        const startDay = new Date(today);
        startDay.setDate(today.getDate() - parseInt(days));
        start = startDay.toISOString().split('T')[0];
      }

      const { data: dailyProgress, error } = await supabase.rpc(
        'get_user_daily_progress',
        {
          p_user_id: userId,
          p_start_date: start,
          p_end_date: end,
        },
      );

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed daily progress analytics`,
      );

      res.json({
        dailyProgress: dailyProgress || [],
        dateRange: {
          startDate: start,
          endDate: end,
        },
      });
    } catch (error) {
      console.error('Get user daily progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve daily progress' });
    }
  },

  // Get user weekly progress
  async getUserWeeklyProgress(req, res) {
    try {
      const userId = req.user.userId;
      const { weeksBack = 12 } = req.query;

      const { data: weeklyProgress, error } = await supabase.rpc(
        'get_user_weekly_progress',
        {
          p_user_id: userId,
          p_weeks_back: parseInt(weeksBack),
        },
      );

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed weekly progress analytics`,
      );

      res.json({
        weeklyProgress: weeklyProgress || [],
      });
    } catch (error) {
      console.error('Get user weekly progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve weekly progress' });
    }
  },

  // ===============================
  // COURSE ANALYTICS
  // ===============================

  // Get user top courses by time spent
  async getUserTopCourses(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;

      const { data: topCourses, error } = await supabase.rpc(
        'get_user_top_courses',
        {
          p_user_id: userId,
          p_limit: parseInt(limit),
        },
      );

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed top courses analytics`,
      );

      res.json({
        topCourses: topCourses || [],
      });
    } catch (error) {
      console.error('Get user top courses error:', error);
      res.status(500).json({ message: 'Failed to retrieve top courses' });
    }
  },

  // Get most time spent course details
  async getMostTimeSpentCourse(req, res) {
    try {
      const userId = req.user.userId;

      const { data: courseData, error } = await supabase
        .from('user_most_time_spent_course')
        .select('*')
        .eq('user_id', userId)
        .order('time_rank')
        .limit(1);

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed most time spent course analytics`,
      );

      res.json({
        mostStudiedCourse: courseData?.[0] || null,
      });
    } catch (error) {
      console.error('Get most time spent course error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve most studied course' });
    }
  },

  // ===============================
  // COMPARATIVE ANALYTICS
  // ===============================

  // Get user comparative analytics
  async getUserComparativeAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      const { data: comparison, error } = await supabase.rpc(
        'get_user_comparative_analytics',
        {
          p_user_id: userId,
        },
      );

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed comparative analytics`,
      );

      res.json({
        comparison: comparison || [],
      });
    } catch (error) {
      console.error('Get user comparative analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve comparative analytics' });
    }
  },

  // Get user recent activity summary
  async getUserRecentActivity(req, res) {
    try {
      const userId = req.user.userId;
      const { daysBack = 7 } = req.query;

      const { data: recentActivity, error } = await supabase.rpc(
        'get_user_recent_activity',
        {
          p_user_id: userId,
          p_days_back: parseInt(daysBack),
        },
      );

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed recent activity analytics`,
      );

      res.json(recentActivity || []);
    } catch (error) {
      console.error('Get user recent activity error:', error);
      res.status(500).json({ message: 'Failed to retrieve recent activity' });
    }
  },

  // ===============================
  // DASHBOARD ANALYTICS
  // ===============================

  // Get comprehensive dashboard analytics
  async getUserDashboardAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      const { data: dashboard, error } = await supabase
        .from('user_analytics_dashboard')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed dashboard analytics`,
      );

      res.json(dashboard || {});
    } catch (error) {
      console.error('Get user dashboard analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve dashboard analytics' });
    }
  },

  // Get analytics summary
  async getUserAnalyticsSummary(req, res) {
    try {
      const userId = req.user.userId;

      const { data: summary, error } = await supabase
        .from('user_analytics_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed analytics summary`,
      );

      res.json(summary || {});
    } catch (error) {
      console.error('Get user analytics summary error:', error);
      res.status(500).json({ message: 'Failed to retrieve analytics summary' });
    }
  },

  // ===============================
  // VIEW-BASED ANALYTICS
  // ===============================

  // Get longest streaks analytics from view
  async getLongestStreaksAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      const { data: streaksData, error } = await supabase
        .from('user_longest_streaks_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('longest_streak_seconds', { ascending: false });

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed longest streaks analytics view`,
      );

      res.json({
        streaksAnalytics: streaksData || [],
      });
    } catch (error) {
      console.error('Get longest streaks analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve streaks analytics' });
    }
  },

  // Get daily progress analytics from view
  async getDailyProgressAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const { days = 30 } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days));

      const { data: dailyData, error } = await supabase
        .from('user_daily_progress_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('study_date', startDate.toISOString().split('T')[0])
        .lte('study_date', endDate.toISOString().split('T')[0])
        .order('study_date', { ascending: false });

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed daily progress analytics view`,
      );

      res.json({
        dailyProgressAnalytics: dailyData || [],
      });
    } catch (error) {
      console.error('Get daily progress analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve daily progress analytics' });
    }
  },

  // Get weekly progress analytics from view
  async getWeeklyProgressAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const { weeks = 12 } = req.query;

      // Calculate date range for weeks
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(weeks) * 7);

      const { data: weeklyData, error } = await supabase
        .from('user_weekly_progress_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('week_start', startDate.toISOString().split('T')[0])
        .lte('week_start', endDate.toISOString().split('T')[0])
        .order('week_start', { ascending: false });

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed weekly progress analytics view`,
      );

      res.json({
        weeklyProgressAnalytics: weeklyData || [],
      });
    } catch (error) {
      console.error('Get weekly progress analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve weekly progress analytics' });
    }
  },

  // Get most time spent course analytics from view
  async getMostTimeSpentCourseAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      const { data: courseData, error } = await supabase
        .from('user_most_time_spent_course')
        .select('*')
        .eq('user_id', userId)
        .order('time_rank');

      if (error) throw error;

      console.log(
        `User ${userId} (${req.user.email}) accessed most time spent course analytics view`,
      );

      res.json({
        courseAnalytics: courseData || [],
      });
    } catch (error) {
      console.error('Get most time spent course analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve course analytics' });
    }
  },

  // ===============================
  // COMPREHENSIVE ANALYTICS ENDPOINT
  // ===============================

  // Get all analytics data in one call
  async getAllUserAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const { daysBack = 30, weeksBack = 12 } = req.query;

      // Execute multiple queries in parallel
      const [
        dashboardResult,
        summaryResult,
        streaksResult,
        dailyProgressResult,
        weeklyProgressResult,
        topCoursesResult,
        comparativeResult,
        recentActivityResult,
      ] = await Promise.allSettled([
        supabase
          .from('user_analytics_dashboard')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_analytics_summary')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase.rpc('get_user_longest_streaks', { p_user_id: userId }),
        supabase.rpc('get_user_daily_progress', {
          p_user_id: userId,
          p_start_date: new Date(
            Date.now() - parseInt(daysBack) * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split('T')[0],
          p_end_date: new Date().toISOString().split('T')[0],
        }),
        supabase.rpc('get_user_weekly_progress', {
          p_user_id: userId,
          p_weeks_back: parseInt(weeksBack),
        }),
        supabase.rpc('get_user_top_courses', {
          p_user_id: userId,
          p_limit: 10,
        }),
        supabase.rpc('get_user_comparative_analytics', { p_user_id: userId }),
        supabase.rpc('get_user_recent_activity', {
          p_user_id: userId,
          p_days_back: 7,
        }),
      ]);

      // Process results
      const analytics = {
        dashboard:
          dashboardResult.status === 'fulfilled'
            ? dashboardResult.value.data
            : null,
        summary:
          summaryResult.status === 'fulfilled'
            ? summaryResult.value.data
            : null,
        longestStreaks:
          streaksResult.status === 'fulfilled' ? streaksResult.value.data : [],
        dailyProgress:
          dailyProgressResult.status === 'fulfilled'
            ? dailyProgressResult.value.data
            : [],
        weeklyProgress:
          weeklyProgressResult.status === 'fulfilled'
            ? weeklyProgressResult.value.data
            : [],
        topCourses:
          topCoursesResult.status === 'fulfilled'
            ? topCoursesResult.value.data
            : [],
        comparative:
          comparativeResult.status === 'fulfilled'
            ? comparativeResult.value.data
            : [],
        recentActivity:
          recentActivityResult.status === 'fulfilled'
            ? recentActivityResult.value.data
            : [],
      };

      console.log(
        `User ${userId} (${req.user.email}) accessed comprehensive analytics`,
      );

      res.json(analytics);
    } catch (error) {
      console.error('Get all user analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve comprehensive analytics' });
    }
  },

  // ===============================
  // LEGACY COMPATIBILITY
  // ===============================

  // Keep existing dashboard method for backward compatibility
  async getUserDashboard(req, res) {
    try {
      const userId = req.user.userId;

      // Get recent study time (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentSessions } = await supabase
        .from('user_topic_study_sessions')
        .select('duration_seconds')
        .eq('user_id', userId)
        .gte('start_time', yesterday.toISOString());

      const recentStudyTime =
        recentSessions?.reduce(
          (sum, session) => sum + (session.duration_seconds || 0),
          0,
        ) || 0;

      // Get daily study time for the past week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weekSessions } = await supabase
        .from('user_topic_study_sessions')
        .select('session_date, duration_seconds')
        .eq('user_id', userId)
        .gte('session_date', weekAgo.toISOString().split('T')[0])
        .order('session_date');

      // Group by date
      const dailyStudyTime = [];
      const dailyMap = new Map();

      weekSessions?.forEach((session) => {
        const date = session.session_date;
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + (session.duration_seconds || 0));
      });

      // Fill in missing days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        dailyStudyTime.push({
          date: dateStr,
          totalDuration: dailyMap.get(dateStr) || 0,
          totalDurationHours:
            Math.round(((dailyMap.get(dateStr) || 0) / 3600) * 10) / 10,
        });
      }

      console.log(
        `User ${userId} (${req.user.email}) accessed dashboard analytics`,
      );

      res.json({
        recentStudyTime,
        recentStudyTimeHours: Math.round((recentStudyTime / 3600) * 10) / 10,
        dailyStudyTime,
      });
    } catch (error) {
      console.error('Get user dashboard error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve dashboard analytics' });
    }
  },
};

module.exports = analyticsController;
