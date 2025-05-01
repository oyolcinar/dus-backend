const { sessionModel, errorAnalyticsModel } = require('../models/studyModels');
const userModel = require('../models/userModel');
const duelResultModel = require('../models/duelResultModel');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');
const db = require('../config/db');

const analyticsController = {
  // Get user's dashboard analytics
  async getUserDashboard(req, res) {
    try {
      const userId = req.user.userId;

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get recent study time (last 24 hours)
      const recentStudyTime = await sessionModel.getRecentStudyTime(userId);

      // Get daily study time for the past week
      const dailyStudyTime = await sessionModel.getDailyStudyTime(userId);

      // Get duel statistics
      const duelStats = await userModel.getDuelStats(userId);

      // Get most problematic topics
      const problematicTopics =
        await errorAnalyticsModel.getMostProblematicTopics(userId, 3);

      // Get study time by topic with accuracy rates
      const topicTimeStats = await sessionModel.getStudyTimeByTopic(userId);
      const topicAccuracyRates =
        await errorAnalyticsModel.getTopicAccuracyRates(userId);

      // Combine time and accuracy data
      const topicAnalytics = topicTimeStats.map((topic) => {
        const accuracyData = topicAccuracyRates.find(
          (t) => t.topic_id === topic.topic_id,
        ) || { accuracy_rate: 0, correct_answers: 0, total_attempts: 0 };

        return {
          topicId: topic.topic_id,
          topicTitle: topic.topic_title,
          totalDuration: topic.total_duration,
          totalDurationHours:
            Math.round((topic.total_duration / 3600) * 10) / 10, // Convert to hours with 1 decimal
          accuracyRate: parseFloat(accuracyData.accuracy_rate).toFixed(1),
          correctAnswers: accuracyData.correct_answers || 0,
          totalAttempts: accuracyData.total_attempts || 0,
        };
      });

      // Sort by study time (most studied first)
      topicAnalytics.sort((a, b) => b.totalDuration - a.totalDuration);

      // Log analytics activity for audit purposes (optional)
      console.log(
        `User ${userId} (${req.user.email}) accessed dashboard analytics`,
      );

      res.json({
        recentStudyTime, // in seconds
        recentStudyTimeHours: Math.round((recentStudyTime / 3600) * 10) / 10, // Convert to hours
        dailyStudyTime,
        duelStats: {
          totalDuels: duelStats.total_duels || 0,
          wins: duelStats.duels_won || 0,
          losses: duelStats.duels_lost || 0,
          winRate: parseFloat(duelStats.win_rate || 0).toFixed(1),
        },
        problematicTopics: problematicTopics.map((topic) => ({
          topicId: topic.topic_id,
          topicTitle: topic.topic_title,
          errorRate: parseFloat(topic.error_rate).toFixed(1),
          totalErrors: topic.total_errors,
          totalAttempts: topic.total_attempts,
        })),
        topicAnalytics: topicAnalytics.slice(0, 5), // Top 5 most studied topics
      });
    } catch (error) {
      console.error('Get user dashboard error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve dashboard analytics' });
    }
  },

  // Get user's weekly progress
  async getWeeklyProgress(req, res) {
    try {
      const userId = req.user.userId;

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get daily study time for the past week
      const dailyStudyTime = await sessionModel.getDailyStudyTime(userId);

      // Fill in missing days with zeros
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const existingEntry = dailyStudyTime.find(
          (entry) => entry.study_date.toISOString().split('T')[0] === dateStr,
        );

        last7Days.push({
          date: dateStr,
          totalDuration: existingEntry
            ? parseInt(existingEntry.total_duration)
            : 0,
          totalDurationHours: existingEntry
            ? Math.round((parseInt(existingEntry.total_duration) / 3600) * 10) /
              10
            : 0,
        });
      }

      // Log analytics activity for audit purposes (optional)
      console.log(
        `User ${userId} (${req.user.email}) accessed weekly progress analytics`,
      );

      res.json({
        dailyProgress: last7Days,
      });
    } catch (error) {
      console.error('Get weekly progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve weekly progress' });
    }
  },

  // Get topic-based analytics
  async getTopicAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get study time by topic
      const topicTimeStats = await sessionModel.getStudyTimeByTopic(userId);

      // Get accuracy rates by topic
      const topicAccuracyRates =
        await errorAnalyticsModel.getTopicAccuracyRates(userId);

      // Combine the data
      const topicAnalytics = topicTimeStats.map((topic) => {
        const accuracyData = topicAccuracyRates.find(
          (t) => t.topic_id === topic.topic_id,
        ) || { accuracy_rate: 0, correct_answers: 0, total_attempts: 0 };

        return {
          topicId: topic.topic_id,
          topicTitle: topic.topic_title,
          totalDuration: parseInt(topic.total_duration),
          totalDurationHours:
            Math.round((parseInt(topic.total_duration) / 3600) * 10) / 10,
          accuracyRate: parseFloat(accuracyData.accuracy_rate).toFixed(1),
          correctAnswers: parseInt(accuracyData.correct_answers) || 0,
          totalAttempts: parseInt(accuracyData.total_attempts) || 0,
        };
      });

      // Log analytics activity for audit purposes (optional)
      console.log(
        `User ${userId} (${req.user.email}) accessed topic analytics`,
      );

      res.json({
        topicAnalytics,
      });
    } catch (error) {
      console.error('Get topic analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve topic analytics' });
    }
  },

  // Get admin analytics overview (admin only)
  async getAdminAnalyticsOverview(req, res) {
    try {
      // Verify admin access through middleware

      // These queries need to be implemented in the database
      const activeUsersQuery = `
        SELECT 
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE date_registered > NOW() - INTERVAL '30 days') as new_users,
          COUNT(*) FILTER (WHERE user_id IN (
            SELECT DISTINCT user_id FROM study_sessions WHERE start_time > NOW() - INTERVAL '7 days'
          )) as active_last_week
        FROM users
      `;

      const studyTimeQuery = `
        SELECT 
          SUM(duration) as total,
          AVG(total_study_time) as average
        FROM study_sessions s
        JOIN users u ON s.user_id = u.user_id
      `;

      const topUsersQuery = `
        SELECT 
          u.user_id, u.username, u.total_study_time,
          CASE 
            WHEN SUM(ua.total_attempts) > 0 THEN 
              (SUM(ua.total_attempts - ua.error_count) * 100.0 / SUM(ua.total_attempts))
            ELSE 0
          END as accuracy
        FROM users u
        LEFT JOIN user_error_analytics ua ON u.user_id = ua.user_id
        GROUP BY u.user_id, u.username, u.total_study_time
        ORDER BY u.total_study_time DESC
        LIMIT 5
      `;

      const totalActiveUsers = await db.query(activeUsersQuery);
      const totalStudyTime = await db.query(studyTimeQuery);
      const topPerformingUsers = await db.query(topUsersQuery);

      // Log admin activity for audit purposes
      console.log(
        `Admin ${req.user.userId} (${req.user.email}) accessed admin analytics overview`,
      );

      res.json({
        usersStats: {
          totalUsers: totalActiveUsers.rows[0].count,
          newUsersLast30Days: totalActiveUsers.rows[0].new_users,
          activeUsersLast7Days: totalActiveUsers.rows[0].active_last_week,
        },
        studyStats: {
          totalHours:
            Math.round((totalStudyTime.rows[0].total / 3600) * 10) / 10,
          averagePerUser:
            Math.round((totalStudyTime.rows[0].average / 3600) * 10) / 10,
        },
        topUsers: topPerformingUsers.rows.map((user) => ({
          userId: user.user_id,
          username: user.username,
          totalStudyTime: Math.round((user.total_study_time / 3600) * 10) / 10,
          accuracy: parseFloat(user.accuracy || 0).toFixed(1),
        })),
      });
    } catch (error) {
      console.error('Get admin analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve admin analytics' });
    }
  },

  // Get user performance analytics (admin/instructor only)
  async getUserPerformanceAnalytics(req, res) {
    try {
      const { userId } = req.query;

      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Define queries based on whether we're getting one user or all users
      let userPerformance;

      if (userId) {
        // Query for specific user performance
        const userQuery = `
          SELECT 
            u.user_id, u.username, u.email, u.date_registered, 
            u.total_duels, u.duels_won, u.duels_lost, 
            u.total_study_time,
            COUNT(DISTINCT ss.session_id) as total_sessions,
            SUM(ss.duration) as session_time,
            COUNT(DISTINCT utr.result_id) as total_tests,
            AVG(utr.score) as avg_test_score,
            COUNT(DISTINCT ua.answer_id) as total_answers,
            SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as correct_answers
          FROM users u
          LEFT JOIN study_sessions ss ON u.user_id = ss.user_id
          LEFT JOIN user_test_results utr ON u.user_id = utr.user_id
          LEFT JOIN user_answers ua ON utr.result_id = ua.result_id
          WHERE u.user_id = $1
          GROUP BY u.user_id, u.username, u.email, u.date_registered, 
            u.total_duels, u.duels_won, u.duels_lost, u.total_study_time
        `;

        const result = await db.query(userQuery, [userId]);
        userPerformance = result.rows[0];

        if (userPerformance) {
          // Add topic breakdown for specific user
          const topicQuery = `
            SELECT 
              t.topic_id, t.title as topic_title,
              SUM(sd.duration) as study_duration,
              COUNT(DISTINCT ua.answer_id) as total_answers,
              SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as correct_answers
            FROM topics t
            LEFT JOIN subtopics st ON t.topic_id = st.topic_id
            LEFT JOIN session_details sd ON st.subtopic_id = sd.subtopic_id
            LEFT JOIN test_questions tq ON st.subtopic_id = tq.topic_id
            LEFT JOIN user_answers ua ON tq.question_id = ua.question_id
            WHERE sd.session_id IN (SELECT session_id FROM study_sessions WHERE user_id = $1)
              OR ua.result_id IN (SELECT result_id FROM user_test_results WHERE user_id = $1)
            GROUP BY t.topic_id, t.title
            ORDER BY study_duration DESC
          `;

          const topicResult = await db.query(topicQuery, [userId]);
          userPerformance.topicBreakdown = topicResult.rows;
        }
      } else {
        // Query for all users' performance (summary)
        const allUsersQuery = `
          SELECT 
            u.user_id, u.username, u.email,
            u.total_duels, u.duels_won, u.duels_lost,
            u.total_study_time,
            COUNT(DISTINCT ss.session_id) as total_sessions,
            COUNT(DISTINCT utr.result_id) as total_tests,
            AVG(utr.score) as avg_test_score
          FROM users u
          LEFT JOIN study_sessions ss ON u.user_id = ss.user_id
          LEFT JOIN user_test_results utr ON u.user_id = utr.user_id
          GROUP BY u.user_id, u.username, u.email, u.total_duels, u.duels_won, u.duels_lost, u.total_study_time
          ORDER BY u.total_study_time DESC
        `;

        const result = await db.query(allUsersQuery);
        userPerformance = result.rows;
      }

      // Log admin activity for audit purposes
      console.log(
        `Admin ${req.user.userId} (${
          req.user.email
        }) accessed user performance analytics${
          userId ? ` for user ${userId}` : ''
        }`,
      );

      res.json({
        userPerformance,
      });
    } catch (error) {
      console.error('Get user performance analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve user performance analytics' });
    }
  },
};

module.exports = analyticsController;
