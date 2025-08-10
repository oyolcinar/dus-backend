const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const analyticsController = {
  // ===============================
  // STREAK ANALYTICS (Course-Based)
  // ===============================

  // Get user's longest course study streaks
  async getUserLongestStreaks(req, res) {
    try {
      const userId = req.user.userId;

      // Query course study sessions for streak calculation
      const { data: sessions, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          `
          session_id,
          course_id,
          study_duration_seconds,
          session_date,
          courses!inner (
            course_id,
            title
          )
        `,
        )
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .order('session_date', { ascending: false });

      if (error) {
        console.error(
          'Error fetching course study sessions for streaks:',
          error,
        );
        throw error;
      }

      // Calculate streaks by course
      const courseStreaks = {};
      let overallLongestSession = 0;
      let overallLongestSessionCourse = null;

      (sessions || []).forEach((session) => {
        const courseId = session.course_id;
        const courseTitle = session.courses.title;
        const duration = session.study_duration_seconds || 0;

        if (!courseStreaks[courseId]) {
          courseStreaks[courseId] = {
            course_id: courseId,
            course_title: courseTitle,
            longest_session_seconds: 0,
            longest_session_date: null,
            total_sessions: 0,
            total_study_seconds: 0,
          };
        }

        const streak = courseStreaks[courseId];
        streak.total_sessions += 1;
        streak.total_study_seconds += duration;

        if (duration > streak.longest_session_seconds) {
          streak.longest_session_seconds = duration;
          streak.longest_session_date = session.session_date;
        }

        if (duration > overallLongestSession) {
          overallLongestSession = duration;
          overallLongestSessionCourse = courseTitle;
        }
      });

      // Transform to array and add calculated fields
      const streaks = Object.values(courseStreaks)
        .map((streak) => ({
          streak_type: 'course',
          course_title: streak.course_title,
          longest_streak_seconds: streak.longest_session_seconds,
          longest_streak_minutes:
            Math.round((streak.longest_session_seconds / 60) * 10) / 10,
          longest_streak_hours:
            Math.round((streak.longest_session_seconds / 3600) * 100) / 100,
          longest_streak_date: streak.longest_session_date,
          total_sessions: streak.total_sessions,
          total_study_seconds: streak.total_study_seconds,
          average_session_seconds: Math.round(
            streak.total_study_seconds / streak.total_sessions,
          ),
        }))
        .sort((a, b) => b.longest_streak_seconds - a.longest_streak_seconds);

      console.log(
        `User ${userId} (${req.user.email}) accessed longest streaks analytics`,
      );

      res.json({
        streaks: streaks,
        overallLongestSession: {
          seconds: overallLongestSession,
          minutes: Math.round((overallLongestSession / 60) * 10) / 10,
          hours: Math.round((overallLongestSession / 3600) * 100) / 100,
          course: overallLongestSessionCourse,
        },
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

      // Get longest single session across all courses
      const { data: longestSession, error: sessionError } = await supabase
        .from('user_course_study_sessions')
        .select(
          `
          study_duration_seconds,
          courses!inner (title)
        `,
        )
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .order('study_duration_seconds', { ascending: false })
        .limit(1);

      if (sessionError) {
        console.error('Error fetching streaks summary:', sessionError);
        throw sessionError;
      }

      // Calculate study streak (consecutive days with study sessions)
      const { data: recentSessions, error: recentError } = await supabase
        .from('user_course_study_sessions')
        .select('session_date')
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .order('session_date', { ascending: false })
        .limit(30); // Last 30 days

      if (recentError) throw recentError;

      // Calculate consecutive study days
      let currentStreak = 0;
      let longestStreak = 0;

      if (recentSessions && recentSessions.length > 0) {
        const uniqueDates = [
          ...new Set(recentSessions.map((s) => s.session_date)),
        ]
          .sort()
          .reverse();
        const today = new Date().toISOString().split('T')[0];

        // Check if user studied today or yesterday to count current streak
        let streakStart = 0;
        if (uniqueDates[0] === today) {
          streakStart = 0;
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (uniqueDates[0] === yesterday.toISOString().split('T')[0]) {
            streakStart = 0;
          } else {
            streakStart = -1; // No current streak
          }
        }

        if (streakStart >= 0) {
          // Calculate current streak
          let currentDate = new Date(uniqueDates[0]);
          for (let i = 0; i < uniqueDates.length; i++) {
            const expectedDate = new Date(currentDate);
            expectedDate.setDate(currentDate.getDate() - i);

            if (uniqueDates[i] === expectedDate.toISOString().split('T')[0]) {
              currentStreak++;
            } else {
              break;
            }
          }
        }

        // Calculate longest streak in the period
        let tempStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i - 1]);
          const currDate = new Date(uniqueDates[i]);
          const daysDiff = Math.abs(
            (prevDate - currDate) / (1000 * 60 * 60 * 24),
          );

          if (daysDiff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      const summary = {
        longest_single_session_minutes: 0,
        longest_single_session_course: null,
        current_streak_days: currentStreak,
        longest_streak_days: longestStreak,
      };

      if (longestSession && longestSession.length > 0) {
        const session = longestSession[0];
        summary.longest_single_session_minutes =
          Math.round((session.study_duration_seconds / 60) * 10) / 10;
        summary.longest_single_session_course = session.courses?.title;
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
  // PROGRESS ANALYTICS (Course-Based)
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

      // Query course study sessions for the date range
      const { data: sessions, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          'session_date, study_duration_seconds, break_duration_seconds, course_id',
        )
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .gte('session_date', start)
        .lte('session_date', end);

      if (error) {
        console.error('Error fetching daily progress:', error);
        throw error;
      }

      // Group sessions by date
      const dailyMap = new Map();

      (sessions || []).forEach((session) => {
        const date = session.session_date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            study_date: date,
            daily_study_minutes: 0,
            daily_break_minutes: 0,
            daily_sessions: 0,
            daily_courses_studied: new Set(),
          });
        }

        const dayData = dailyMap.get(date);
        dayData.daily_study_minutes +=
          (session.study_duration_seconds || 0) / 60;
        dayData.daily_break_minutes +=
          (session.break_duration_seconds || 0) / 60;
        dayData.daily_sessions += 1;
        dayData.daily_courses_studied.add(session.course_id);
      });

      // Convert to array and fill in missing days
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
            daily_break_minutes:
              Math.round(dayData.daily_break_minutes * 10) / 10,
            daily_courses_studied: dayData.daily_courses_studied.size,
          });
        } else {
          dailyProgress.push({
            study_date: dateStr,
            daily_study_minutes: 0,
            daily_break_minutes: 0,
            daily_sessions: 0,
            daily_courses_studied: 0,
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
        .from('user_course_study_sessions')
        .select(
          'session_date, study_duration_seconds, break_duration_seconds, course_id',
        )
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .gte('session_date', startDate.toISOString().split('T')[0])
        .lte('session_date', endDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching weekly progress:', error);
        throw error;
      }

      // Group by weeks
      const weeklyMap = new Map();

      (sessions || []).forEach((session) => {
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
            weekly_break_hours: 0,
            weekly_sessions: 0,
            weekly_courses_studied: new Set(),
            weekly_study_days: new Set(),
          });
        }

        const weekData = weeklyMap.get(weekKey);
        weekData.weekly_study_hours +=
          (session.study_duration_seconds || 0) / 3600;
        weekData.weekly_break_hours +=
          (session.break_duration_seconds || 0) / 3600;
        weekData.weekly_sessions += 1;
        weekData.weekly_courses_studied.add(session.course_id);
        weekData.weekly_study_days.add(session.session_date);
      });

      // Convert to array
      const weeklyProgress = Array.from(weeklyMap.values())
        .map((week) => ({
          ...week,
          weekly_study_hours: Math.round(week.weekly_study_hours * 100) / 100,
          weekly_break_hours: Math.round(week.weekly_break_hours * 100) / 100,
          weekly_courses_studied: week.weekly_courses_studied.size,
          weekly_study_days: week.weekly_study_days.size,
          weekly_consistency_percentage:
            Math.round((week.weekly_study_days.size / 7) * 100 * 10) / 10,
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

  // Get user's top courses by time spent
  async getUserTopCourses(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;

      // Query from course study overview
      const { data: coursesData, error } = await supabase
        .from('user_course_study_overview')
        .select('*')
        .eq('user_id', userId)
        .gt('total_study_time_seconds', 0)
        .order('total_study_time_seconds', { ascending: false })
        .limit(parseInt(limit));

      if (error) {
        console.error('Error fetching top courses:', error);
        throw error;
      }

      const topCourses = (coursesData || []).map((course, index) => ({
        rank: index + 1,
        course_id: course.course_id,
        course_title: course.course_title,
        course_type: course.course_type,
        total_time_hours: course.total_study_time_hours || 0,
        study_session_hours: course.total_study_time_hours || 0,
        break_hours:
          Math.round(((course.total_break_time_seconds || 0) / 3600) * 100) /
          100,
        total_sessions: course.total_session_count || 0,
        completion_percentage: course.completion_percentage || 0,
        is_completed: course.is_completed || false,
        last_studied_at: course.last_studied_at,
        difficulty_rating: course.difficulty_rating,
        tekrar_sayisi: course.tekrar_sayisi || 0,
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

      // Get top course
      const { data: topCourse, error } = await supabase
        .from('user_course_study_overview')
        .select('*')
        .eq('user_id', userId)
        .gt('total_study_time_seconds', 0)
        .order('total_study_time_seconds', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching most studied course:', error);
        throw error;
      }

      console.log(
        `User ${userId} (${req.user.email}) accessed most time spent course analytics`,
      );

      res.json({
        mostStudiedCourse: topCourse
          ? {
              user_id: userId,
              course_id: topCourse.course_id,
              course_title: topCourse.course_title,
              course_type: topCourse.course_type,
              total_time_hours: topCourse.total_study_time_hours || 0,
              study_session_hours: topCourse.total_study_time_hours || 0,
              break_hours:
                Math.round(
                  ((topCourse.total_break_time_seconds || 0) / 3600) * 100,
                ) / 100,
              total_sessions: topCourse.total_session_count || 0,
              completion_percentage: topCourse.completion_percentage || 0,
              is_completed: topCourse.is_completed || false,
              time_rank: 1,
              last_studied_at: topCourse.last_studied_at,
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
  // DASHBOARD ANALYTICS
  // ===============================

  // Get comprehensive dashboard analytics
  async getUserDashboardAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      // Get overall user study statistics
      const { data: userStats, error: statsError } = await supabase
        .from('user_study_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching user study statistics:', statsError);
        throw statsError;
      }

      // Get recent sessions for streak calculation
      const { data: recentSessions, error: sessionsError } = await supabase
        .from('user_course_study_sessions')
        .select('study_duration_seconds, session_date')
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .order('session_date', { ascending: false })
        .limit(30);

      if (sessionsError) {
        console.error('Error fetching recent sessions:', sessionsError);
        throw sessionsError;
      }

      // Calculate current streak
      let currentStreak = 0;
      if (recentSessions && recentSessions.length > 0) {
        const uniqueDates = [
          ...new Set(recentSessions.map((s) => s.session_date)),
        ]
          .sort()
          .reverse();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (uniqueDates.includes(today) || uniqueDates.includes(yesterdayStr)) {
          let currentDate = new Date(uniqueDates[0]);
          for (let i = 0; i < uniqueDates.length; i++) {
            const expectedDate = new Date(currentDate);
            expectedDate.setDate(currentDate.getDate() - i);

            if (uniqueDates[i] === expectedDate.toISOString().split('T')[0]) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }

      // Find longest session
      const longestSessionSeconds = Math.max(
        ...(recentSessions?.map((s) => s.study_duration_seconds) || [0]),
      );

      // Get most studied course
      const { data: mostStudiedCourse } = await supabase
        .from('user_course_study_overview')
        .select('course_title, total_study_time_seconds')
        .eq('user_id', userId)
        .gt('total_study_time_seconds', 0)
        .order('total_study_time_seconds', { ascending: false })
        .limit(1)
        .single();

      const dashboard = {
        total_study_hours: userStats?.total_study_hours || 0,
        total_sessions: userStats?.total_sessions || 0,
        unique_courses_studied: userStats?.courses_studied || 0,
        courses_completed: userStats?.courses_completed || 0,
        longest_session_minutes:
          Math.round((longestSessionSeconds / 60) * 10) / 10,
        average_session_minutes: userStats?.avg_session_duration_seconds
          ? Math.round((userStats.avg_session_duration_seconds / 60) * 10) / 10
          : 0,
        current_streak_days: currentStreak,
        most_studied_course: mostStudiedCourse?.course_title || null,
        last_study_date: userStats?.last_study_date || null,
        last_7_days_hours: 0, // Would need to calculate
        last_30_days_hours: 0, // Would need to calculate
        courses_studied_this_week: userStats?.courses_studied_this_week || 0,
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

      // Get user study statistics
      const { data: userStats, error } = await supabase
        .from('user_study_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching analytics summary:', error);
        throw error;
      }

      // Get longest session
      const { data: longestSession } = await supabase
        .from('user_course_study_sessions')
        .select('study_duration_seconds')
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .order('study_duration_seconds', { ascending: false })
        .limit(1)
        .single();

      const summary = {
        user_id: userId,
        total_study_time_hours: userStats?.total_study_hours || 0,
        total_sessions: userStats?.total_sessions || 0,
        average_session_duration: userStats?.avg_session_duration_seconds
          ? Math.round((userStats.avg_session_duration_seconds / 60) * 10) / 10
          : 0,
        unique_courses_count: userStats?.courses_studied || 0,
        courses_completed_count: userStats?.courses_completed || 0,
        longest_streak_minutes: longestSession?.study_duration_seconds
          ? Math.round((longestSession.study_duration_seconds / 60) * 10) / 10
          : 0,
        current_streak_days: 0, // Would need to calculate
        total_break_time_hours: 0, // Would need to calculate from sessions
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
  // ENHANCED ANALYTICS
  // ===============================

  // Get user comparative analytics (course-based)
  async getUserComparativeAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      // Get user's statistics
      const { data: userStats } = await supabase
        .from('user_study_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get platform averages (mock data for now - would need aggregate queries)
      const comparison = [
        {
          metric_name: 'Study Hours',
          user_value: userStats?.total_study_hours || 0,
          platform_average: 18.5,
          user_rank: Math.floor(Math.random() * 500) + 1,
          total_users: 1000,
          percentile: 0,
        },
        {
          metric_name: 'Courses Studied',
          user_value: userStats?.courses_studied || 0,
          platform_average: 3.2,
          user_rank: Math.floor(Math.random() * 500) + 1,
          total_users: 1000,
          percentile: 0,
        },
        {
          metric_name: 'Session Length',
          user_value: userStats?.avg_session_duration_seconds
            ? Math.round((userStats.avg_session_duration_seconds / 60) * 10) /
              10
            : 0,
          platform_average: 32.1,
          user_rank: Math.floor(Math.random() * 500) + 1,
          total_users: 1000,
          percentile: 0,
        },
      ];

      // Calculate percentiles
      comparison.forEach((metric) => {
        metric.percentile =
          Math.round(
            ((metric.total_users - metric.user_rank) / metric.total_users) *
              100 *
              10,
          ) / 10;
      });

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

  // Get user recent activity
  async getUserRecentActivity(req, res) {
    try {
      const userId = req.user.userId;
      const { daysBack = 7 } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(daysBack));

      const { data: sessions, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          'study_duration_seconds, break_duration_seconds, session_date, course_id',
        )
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .gte('session_date', startDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching recent activity:', error);
        throw error;
      }

      const totalStudyMinutes = (sessions || []).reduce(
        (sum, s) => sum + (s.study_duration_seconds || 0) / 60,
        0,
      );
      const totalBreakMinutes = (sessions || []).reduce(
        (sum, s) => sum + (s.break_duration_seconds || 0) / 60,
        0,
      );
      const activeDays = new Set((sessions || []).map((s) => s.session_date))
        .size;
      const uniqueCourses = new Set((sessions || []).map((s) => s.course_id))
        .size;

      // Find best day
      const dailyTotals = {};
      (sessions || []).forEach((session) => {
        const date = session.session_date;
        dailyTotals[date] =
          (dailyTotals[date] || 0) + (session.study_duration_seconds || 0);
      });

      const bestDay = Object.entries(dailyTotals).reduce(
        (best, [date, duration]) =>
          duration > best.duration ? { date, duration } : best,
        { date: null, duration: 0 },
      );

      const recentActivity = [
        {
          period_name: `Last ${daysBack} days`,
          total_study_minutes: Math.round(totalStudyMinutes * 10) / 10,
          total_break_minutes: Math.round(totalBreakMinutes * 10) / 10,
          total_sessions: (sessions || []).length,
          unique_courses: uniqueCourses,
          consistency_days: activeDays,
          best_day: bestDay.date,
          best_day_minutes: Math.round((bestDay.duration / 60) * 10) / 10,
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
  // COMPREHENSIVE ANALYTICS - FIXED
  // ===============================

  // Get all user analytics in one call
  async getAllUserAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const { daysBack = 30, weeksBack = 12 } = req.query;

      console.log(`🔍 Getting comprehensive analytics for user ${userId}`);

      // Execute analytics functions in parallel - FIXED: Use analyticsController instead of this
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
        analyticsController.getUserDashboardAnalytics(
          { user: req.user },
          { json: (data) => data },
        ),
        analyticsController.getUserAnalyticsSummary(
          { user: req.user },
          { json: (data) => data },
        ),
        analyticsController.getUserLongestStreaks(
          { user: req.user },
          { json: (data) => data },
        ),
        analyticsController.getUserDailyProgress(
          { user: req.user, query: { ...req.query, days: daysBack } },
          { json: (data) => data },
        ),
        analyticsController.getUserWeeklyProgress(
          { user: req.user, query: { ...req.query, weeksBack } },
          { json: (data) => data },
        ),
        analyticsController.getUserTopCourses(
          { user: req.user, query: { ...req.query, limit: 10 } },
          { json: (data) => data },
        ),
        analyticsController.getUserComparativeAnalytics(
          { user: req.user },
          { json: (data) => data },
        ),
        analyticsController.getUserRecentActivity(
          { user: req.user, query: { ...req.query, daysBack: 7 } },
          { json: (data) => data },
        ),
      ]);

      // Log results for debugging
      console.log('📊 Analytics results:', {
        dashboard: dashboardResult.status,
        summary: summaryResult.status,
        streaks: streaksResult.status,
        dailyProgress: dailyProgressResult.status,
        weeklyProgress: weeklyProgressResult.status,
        topCourses: topCoursesResult.status,
        comparative: comparativeResult.status,
        recentActivity: recentActivityResult.status,
      });

      // Log any failures for debugging
      [
        dashboardResult,
        summaryResult,
        streaksResult,
        dailyProgressResult,
        weeklyProgressResult,
        topCoursesResult,
        comparativeResult,
        recentActivityResult,
      ].forEach((result, index) => {
        if (result.status === 'rejected') {
          const methodNames = [
            'dashboard',
            'summary',
            'streaks',
            'dailyProgress',
            'weeklyProgress',
            'topCourses',
            'comparative',
            'recentActivity',
          ];
          console.error(`❌ ${methodNames[index]} failed:`, result.reason);
        }
      });

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
        `✅ User ${userId} (${req.user.email}) accessed comprehensive analytics`,
      );

      res.json(analytics);
    } catch (error) {
      console.error('❌ Get all user analytics error:', error);
      res.status(500).json({
        message: 'Failed to retrieve comprehensive analytics',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // ===============================
  // DASHBOARD ENDPOINT (Updated for course-based)
  // ===============================

  async getUserDashboard(req, res) {
    try {
      const userId = req.user.userId;

      // Get recent study time (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentSessions } = await supabase
        .from('user_course_study_sessions')
        .select('study_duration_seconds, break_duration_seconds')
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .gte('start_time', yesterday.toISOString());

      const recentStudyTime = (recentSessions || []).reduce(
        (sum, session) => sum + (session.study_duration_seconds || 0),
        0,
      );

      // Get daily study time for the past week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weekSessions } = await supabase
        .from('user_course_study_sessions')
        .select('session_date, study_duration_seconds')
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .gte('session_date', weekAgo.toISOString().split('T')[0])
        .order('session_date');

      // Group by date
      const dailyStudyTime = [];
      const dailyMap = new Map();

      (weekSessions || []).forEach((session) => {
        const date = session.session_date;
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + (session.study_duration_seconds || 0));
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

      console.log(`User ${userId} (${req.user.email}) accessed dashboard`);

      res.json({
        recentStudyTime,
        recentStudyTimeHours: Math.round((recentStudyTime / 3600) * 10) / 10,
        dailyStudyTime,
        courseAnalytics: [], // Can be populated with course-specific data
      });
    } catch (error) {
      console.error('Get user dashboard error:', error);
      res.status(500).json({ message: 'Failed to retrieve dashboard' });
    }
  },

  // ===============================
  // LEGACY COMPATIBILITY METHODS
  // ===============================

  async getUserPerformanceAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      // Get study statistics
      const { data: userStats } = await supabase
        .from('user_study_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      const response = {
        coursePerformance: [], // Course-based performance data
        totalQuestionsAnswered: 0, // Would come from test results
        overallAccuracy: 0, // Would come from test results
        studyTime: userStats?.total_study_seconds || 0,
        studySessions: userStats?.total_sessions || 0,
        averageSessionDuration: userStats?.avg_session_duration_seconds || 0,
        totalCourses: userStats?.courses_studied || 0,
        completedCourses: userStats?.courses_completed || 0,
      };

      console.log(
        `User ${userId} (${req.user.email}) accessed performance analytics`,
      );

      res.json(response);
    } catch (error) {
      console.error('Get user performance analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve performance analytics' });
    }
  },

  // Enhanced alias methods for backward compatibility - FIXED
  async getLongestStreaksAnalytics(req, res) {
    try {
      await analyticsController.getUserLongestStreaks(req, {
        json: (data) => res.json({ streaksAnalytics: data.streaks }),
      });
    } catch (error) {
      console.error('Get longest streaks analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve streaks analytics' });
    }
  },

  async getDailyProgressAnalytics(req, res) {
    try {
      await analyticsController.getUserDailyProgress(req, {
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
      await analyticsController.getUserWeeklyProgress(req, {
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
      await analyticsController.getUserTopCourses(req, {
        json: (data) => res.json({ courseAnalytics: data.topCourses }),
      });
    } catch (error) {
      console.error('Get course analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve course analytics' });
    }
  },
};

module.exports = analyticsController;
