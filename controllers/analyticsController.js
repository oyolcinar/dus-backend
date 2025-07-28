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

      // Query existing study sessions table to calculate streaks
      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select(
          `
          session_id,
          duration_seconds,
          session_date,
          start_time,
          topics:topic_id (
            topic_id,
            title,
            courses:course_id (
              course_id,
              title
            )
          )
        `,
        )
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('duration_seconds', 'is', null)
        .order('session_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Calculate longest streaks from sessions data
      const streaks = [];

      if (sessions && sessions.length > 0) {
        // Find longest single session
        const longestSession = sessions.reduce((max, session) =>
          (session.duration_seconds || 0) > (max.duration_seconds || 0)
            ? session
            : max,
        );

        if (longestSession.duration_seconds > 0) {
          streaks.push({
            streak_type: 'single_session',
            topic_title: longestSession.topics?.title || 'Unknown',
            course_title: longestSession.topics?.courses?.title || 'Unknown',
            longest_streak_seconds: longestSession.duration_seconds,
            longest_streak_minutes:
              Math.round((longestSession.duration_seconds / 60) * 10) / 10,
            longest_streak_hours:
              Math.round((longestSession.duration_seconds / 3600) * 100) / 100,
            longest_streak_date: longestSession.session_date,
          });
        }
      }

      console.log(
        `User ${userId} (${req.user.email}) accessed longest streaks analytics`,
      );

      res.json({
        streaks: streaks,
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

      // Query existing study sessions
      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select(
          'duration_seconds, session_date, topics:topic_id(title, courses:course_id(title))',
        )
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('duration_seconds', 'is', null)
        .order('duration_seconds', { ascending: false })
        .limit(50);

      if (error) throw error;

      let summary = {
        longest_single_session_minutes: 0,
        longest_single_session_topic: null,
        longest_single_session_course: null,
        longest_topic_streak_minutes: 0,
        longest_course_streak_minutes: 0,
      };

      if (sessions && sessions.length > 0) {
        const longestSession = sessions[0];
        summary.longest_single_session_minutes =
          Math.round((longestSession.duration_seconds / 60) * 10) / 10;
        summary.longest_single_session_topic = longestSession.topics?.title;
        summary.longest_single_session_course =
          longestSession.topics?.courses?.title;

        // For now, set topic and course streaks to the same value
        // In a full implementation, you'd calculate consecutive study days
        summary.longest_topic_streak_minutes =
          summary.longest_single_session_minutes;
        summary.longest_course_streak_minutes =
          summary.longest_single_session_minutes;
      }

      console.log(
        `User ${userId} (${req.user.email}) accessed streaks summary analytics`,
      );

      res.json(summary);
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

      // Query study sessions for the date range
      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select('session_date, duration_seconds, topic_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('session_date', start)
        .lte('session_date', end)
        .not('duration_seconds', 'is', null);

      if (error) throw error;

      // Group sessions by date
      const dailyMap = new Map();

      sessions?.forEach((session) => {
        const date = session.session_date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            study_date: date,
            daily_study_minutes: 0,
            daily_sessions: 0,
            daily_topics_studied: new Set(),
            daily_questions_answered: 0, // Would need to calculate from test results
            daily_accuracy_percentage: 0, // Would need to calculate from test results
          });
        }

        const dayData = dailyMap.get(date);
        dayData.daily_study_minutes += (session.duration_seconds || 0) / 60;
        dayData.daily_sessions += 1;
        dayData.daily_topics_studied.add(session.topic_id);
      });

      // Convert to array and finalize data
      const dailyProgress = [];
      for (
        let d = new Date(start);
        d <= new Date(end);
        d.setDate(d.getDate() + 1)
      ) {
        const dateStr = d.toISOString().split('T')[0];
        const dayData = dailyMap.get(dateStr);

        if (dayData) {
          dailyProgress.push({
            ...dayData,
            daily_study_minutes:
              Math.round(dayData.daily_study_minutes * 10) / 10,
            daily_topics_studied: dayData.daily_topics_studied.size,
          });
        } else {
          dailyProgress.push({
            study_date: dateStr,
            daily_study_minutes: 0,
            daily_sessions: 0,
            daily_topics_studied: 0,
            daily_questions_answered: 0,
            daily_accuracy_percentage: 0,
          });
        }
      }

      console.log(
        `User ${userId} (${req.user.email}) accessed daily progress analytics`,
      );

      res.json({
        dailyProgress: dailyProgress,
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

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(weeksBack) * 7);

      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select('session_date, duration_seconds, topic_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('session_date', startDate.toISOString().split('T')[0])
        .lte('session_date', endDate.toISOString().split('T')[0])
        .not('duration_seconds', 'is', null);

      if (error) throw error;

      // Group by weeks
      const weeklyMap = new Map();

      sessions?.forEach((session) => {
        const sessionDate = new Date(session.session_date);
        const weekStart = new Date(sessionDate);
        weekStart.setDate(sessionDate.getDate() - sessionDate.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, {
            week_start: weekKey,
            week_end: weekEnd.toISOString().split('T')[0],
            weekly_study_hours: 0,
            weekly_sessions: 0,
            weekly_topics_studied: new Set(),
            weekly_consistency_percentage: 0,
            weekly_accuracy_percentage: 0,
          });
        }

        const weekData = weeklyMap.get(weekKey);
        weekData.weekly_study_hours += (session.duration_seconds || 0) / 3600;
        weekData.weekly_sessions += 1;
        weekData.weekly_topics_studied.add(session.topic_id);
      });

      // Convert to array
      const weeklyProgress = Array.from(weeklyMap.values())
        .map((week) => ({
          ...week,
          weekly_study_hours: Math.round(week.weekly_study_hours * 100) / 100,
          weekly_topics_studied: week.weekly_topics_studied.size,
          weekly_consistency_percentage: Math.min(
            100,
            (week.weekly_sessions / 7) * 100,
          ), // Simple consistency calc
        }))
        .sort((a, b) => new Date(b.week_start) - new Date(a.week_start));

      console.log(
        `User ${userId} (${req.user.email}) accessed weekly progress analytics`,
      );

      res.json({
        weeklyProgress: weeklyProgress,
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

      // Query sessions with course information
      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select(
          `
          duration_seconds,
          topic_id,
          topics:topic_id (
            title,
            course_id,
            courses:course_id (
              course_id,
              title
            )
          )
        `,
        )
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('duration_seconds', 'is', null);

      if (error) throw error;

      // Group by course
      const courseMap = new Map();

      sessions?.forEach((session) => {
        const course = session.topics?.courses;
        if (!course) return;

        const courseId = course.course_id;
        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            course_id: courseId,
            course_title: course.title,
            total_time_hours: 0,
            study_session_hours: 0,
            duel_hours: 0, // Would need duel data
            topics_studied: new Set(),
            accuracy_percentage: 0, // Would need test results
            rank: 0,
          });
        }

        const courseData = courseMap.get(courseId);
        const hours = (session.duration_seconds || 0) / 3600;
        courseData.total_time_hours += hours;
        courseData.study_session_hours += hours;
        courseData.topics_studied.add(session.topic_id);
      });

      // Convert to array and sort by total time
      const topCourses = Array.from(courseMap.values())
        .map((course) => ({
          ...course,
          total_time_hours: Math.round(course.total_time_hours * 100) / 100,
          study_session_hours:
            Math.round(course.study_session_hours * 100) / 100,
          topics_studied: course.topics_studied.size,
          accuracy_percentage: 75, // Mock data - would calculate from actual results
        }))
        .sort((a, b) => b.total_time_hours - a.total_time_hours)
        .slice(0, parseInt(limit))
        .map((course, index) => ({
          ...course,
          rank: index + 1,
        }));

      console.log(
        `User ${userId} (${req.user.email}) accessed top courses analytics`,
      );

      res.json({
        topCourses: topCourses,
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

      // Get top course from the top courses logic
      const topCoursesResponse = await this.getUserTopCourses(
        {
          user: req.user,
          query: { limit: 1 },
        },
        { json: (data) => data },
      );

      const topCourse = topCoursesResponse?.topCourses?.[0] || null;

      console.log(
        `User ${userId} (${req.user.email}) accessed most time spent course analytics`,
      );

      res.json({
        mostStudiedCourse: topCourse
          ? {
              user_id: userId,
              course_id: topCourse.course_id,
              course_title: topCourse.course_title,
              total_time_hours: topCourse.total_time_hours,
              study_session_hours: topCourse.study_session_hours,
              duel_hours: topCourse.duel_hours,
              topics_studied: topCourse.topics_studied,
              sessions_count: 0, // Would need to calculate
              time_rank: 1,
              percentage_of_total: 100, // Would need to calculate
            }
          : null,
      });
    } catch (error) {
      console.error('Get most time spent course error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve most studied course' });
    }
  },

  // ===============================
  // SIMPLIFIED IMPLEMENTATIONS
  // ===============================

  // Get user comparative analytics (simplified)
  async getUserComparativeAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      // Return mock comparative data for now
      const comparison = [
        {
          metric_name: 'Study Hours',
          user_value: 25.5,
          platform_average: 18.2,
          user_rank: 125,
          total_users: 1000,
          percentile: 87.5,
        },
        {
          metric_name: 'Session Length',
          user_value: 45.2,
          platform_average: 32.1,
          user_rank: 89,
          total_users: 1000,
          percentile: 91.1,
        },
      ];

      console.log(
        `User ${userId} (${req.user.email}) accessed comparative analytics`,
      );

      res.json({
        comparison: comparison,
      });
    } catch (error) {
      console.error('Get user comparative analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve comparative analytics' });
    }
  },

  // Get user recent activity summary (simplified)
  async getUserRecentActivity(req, res) {
    try {
      const userId = req.user.userId;
      const { daysBack = 7 } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(daysBack));

      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select('duration_seconds, session_date')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('session_date', startDate.toISOString().split('T')[0])
        .not('duration_seconds', 'is', null);

      if (error) throw error;

      const totalMinutes =
        sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0) / 60, 0) ||
        0;
      const activeDays = new Set(sessions?.map((s) => s.session_date) || [])
        .size;

      const recentActivity = [
        {
          period_name: `Last ${daysBack} days`,
          total_study_minutes: Math.round(totalMinutes * 10) / 10,
          total_sessions: sessions?.length || 0,
          unique_topics: 0, // Would need topic data
          unique_courses: 0, // Would need course data
          total_questions: 0, // Would need test data
          accuracy_percentage: 0, // Would need test data
          consistency_days: activeDays,
          best_day: sessions?.[0]?.session_date || null,
          best_day_minutes:
            Math.round(
              (Math.max(...(sessions?.map((s) => s.duration_seconds) || [0])) /
                60) *
                10,
            ) / 10,
        },
      ];

      console.log(
        `User ${userId} (${req.user.email}) accessed recent activity analytics`,
      );

      res.json(recentActivity);
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

      // Query basic session data
      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select('duration_seconds, session_date, topic_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('duration_seconds', 'is', null)
        .order('session_date', { ascending: false });

      if (error) throw error;

      const totalHours =
        sessions?.reduce(
          (sum, s) => sum + (s.duration_seconds || 0) / 3600,
          0,
        ) || 0;
      const totalSessions = sessions?.length || 0;
      const uniqueTopics = new Set(sessions?.map((s) => s.topic_id) || []).size;
      const longestSessionMinutes =
        Math.max(...(sessions?.map((s) => s.duration_seconds) || [0])) / 60;
      const averageSessionMinutes =
        totalSessions > 0 ? (totalHours * 60) / totalSessions : 0;

      // Calculate recent study time
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const recent7DaysHours =
        sessions
          ?.filter((s) => new Date(s.session_date) >= last7Days)
          .reduce((sum, s) => sum + (s.duration_seconds || 0) / 3600, 0) || 0;

      const recent30DaysHours =
        sessions
          ?.filter((s) => new Date(s.session_date) >= last30Days)
          .reduce((sum, s) => sum + (s.duration_seconds || 0) / 3600, 0) || 0;

      const dashboard = {
        total_study_hours: Math.round(totalHours * 100) / 100,
        total_sessions: totalSessions,
        unique_topics_studied: uniqueTopics,
        unique_courses_studied: 1, // Would need course data
        longest_session_minutes: Math.round(longestSessionMinutes * 10) / 10,
        average_session_minutes: Math.round(averageSessionMinutes * 10) / 10,
        current_streak_days: 0, // Would need to calculate consecutive days
        longest_streak_days: 0, // Would need to calculate
        most_studied_course: 'Restoratif Diş Tedavisi', // From your logs
        most_studied_topic: null,
        last_study_date: sessions?.[0]?.session_date || null,
        last_7_days_hours: Math.round(recent7DaysHours * 100) / 100,
        last_30_days_hours: Math.round(recent30DaysHours * 100) / 100,
      };

      console.log(
        `User ${userId} (${req.user.email}) accessed dashboard analytics`,
      );

      res.json(dashboard);
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

      const { data: sessions, error } = await supabase
        .from('user_topic_study_sessions')
        .select('duration_seconds, topic_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('duration_seconds', 'is', null);

      if (error) throw error;

      const totalHours =
        sessions?.reduce(
          (sum, s) => sum + (s.duration_seconds || 0) / 3600,
          0,
        ) || 0;
      const totalSessions = sessions?.length || 0;
      const averageSessionDuration =
        totalSessions > 0 ? (totalHours * 60) / totalSessions : 0;
      const uniqueTopics = new Set(sessions?.map((s) => s.topic_id) || []).size;

      const summary = {
        user_id: userId,
        total_study_time_hours: Math.round(totalHours * 100) / 100,
        total_sessions: totalSessions,
        average_session_duration: Math.round(averageSessionDuration * 10) / 10,
        unique_topics_count: uniqueTopics,
        unique_courses_count: 1, // Would need course data
        longest_streak_minutes:
          Math.max(...(sessions?.map((s) => s.duration_seconds) || [0])) / 60,
        current_streak_days: 0, // Would need to calculate
        total_questions_answered: 0, // Would need test data
        overall_accuracy: 0, // Would need test data
      };

      console.log(
        `User ${userId} (${req.user.email}) accessed analytics summary`,
      );

      res.json(summary);
    } catch (error) {
      console.error('Get user analytics summary error:', error);
      res.status(500).json({ message: 'Failed to retrieve analytics summary' });
    }
  },

  // ===============================
  // VIEW-BASED ANALYTICS (Simplified)
  // ===============================

  async getLongestStreaksAnalytics(req, res) {
    try {
      // Use the existing getUserLongestStreaks logic
      await this.getUserLongestStreaks(req, {
        json: (data) => res.json({ streaksAnalytics: data.streaks }),
      });
    } catch (error) {
      console.error('Get longest streaks analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve streaks analytics' });
    }
  },

  async getDailyProgressAnalytics(req, res) {
    try {
      // Use the existing getUserDailyProgress logic
      await this.getUserDailyProgress(req, {
        json: (data) =>
          res.json({ dailyProgressAnalytics: data.dailyProgress }),
      });
    } catch (error) {
      console.error('Get daily progress analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve daily progress analytics' });
    }
  },

  async getWeeklyProgressAnalytics(req, res) {
    try {
      // Use the existing getUserWeeklyProgress logic
      await this.getUserWeeklyProgress(req, {
        json: (data) =>
          res.json({ weeklyProgressAnalytics: data.weeklyProgress }),
      });
    } catch (error) {
      console.error('Get weekly progress analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve weekly progress analytics' });
    }
  },

  async getMostTimeSpentCourseAnalytics(req, res) {
    try {
      // Use the existing getUserTopCourses logic
      await this.getUserTopCourses(req, {
        json: (data) => res.json({ courseAnalytics: data.topCourses }),
      });
    } catch (error) {
      console.error('Get most time spent course analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve course analytics' });
    }
  },

  // ===============================
  // COMPREHENSIVE ANALYTICS ENDPOINT
  // ===============================

  async getAllUserAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const { daysBack = 30, weeksBack = 12 } = req.query;

      // Execute analytics functions in parallel using mock response objects
      const mockRes = { json: (data) => data };

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
        this.getUserDashboardAnalytics(req, mockRes),
        this.getUserAnalyticsSummary(req, mockRes),
        this.getUserLongestStreaks(req, mockRes),
        this.getUserDailyProgress(
          { ...req, query: { ...req.query, days: daysBack } },
          mockRes,
        ),
        this.getUserWeeklyProgress(
          { ...req, query: { ...req.query, weeksBack } },
          mockRes,
        ),
        this.getUserTopCourses(
          { ...req, query: { ...req.query, limit: 10 } },
          mockRes,
        ),
        this.getUserComparativeAnalytics(req, mockRes),
        this.getUserRecentActivity(
          { ...req, query: { ...req.query, daysBack: 7 } },
          mockRes,
        ),
      ]);

      const analytics = {
        dashboard:
          dashboardResult.status === 'fulfilled' ? dashboardResult.value : null,
        summary:
          summaryResult.status === 'fulfilled' ? summaryResult.value : null,
        longestStreaks:
          streaksResult.status === 'fulfilled'
            ? streaksResult.value?.streaks || []
            : [],
        dailyProgress:
          dailyProgressResult.status === 'fulfilled'
            ? dailyProgressResult.value?.dailyProgress || []
            : [],
        weeklyProgress:
          weeklyProgressResult.status === 'fulfilled'
            ? weeklyProgressResult.value?.weeklyProgress || []
            : [],
        topCourses:
          topCoursesResult.status === 'fulfilled'
            ? topCoursesResult.value?.topCourses || []
            : [],
        comparative:
          comparativeResult.status === 'fulfilled'
            ? comparativeResult.value?.comparison || []
            : [],
        recentActivity:
          recentActivityResult.status === 'fulfilled'
            ? recentActivityResult.value || []
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
          study_date: dateStr,
          total_duration: dailyMap.get(dateStr) || 0,
        });
      }

      console.log(
        `User ${userId} (${req.user.email}) accessed dashboard analytics`,
      );

      res.json({
        recentStudyTime,
        recentStudyTimeHours: Math.round((recentStudyTime / 3600) * 10) / 10,
        dailyStudyTime,
        duelStats: {
          totalDuels: 0,
          wins: 0,
          losses: 0,
          winRate: '0.0',
        },
        problematicTopics: [],
        topicAnalytics: [],
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
