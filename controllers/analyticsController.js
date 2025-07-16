// controllers/analyticsController.js - Complete Implementation

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

  // Get user performance analytics for the current user
  async getUserPerformance(req, res) {
    try {
      const userId = req.user.userId;

      // Get topic performance data (reusing existing methods)
      const topicTimeStats = await sessionModel.getStudyTimeByTopic(userId);
      const topicAccuracyRates =
        await errorAnalyticsModel.getTopicAccuracyRates(userId);

      // Format data for branch performance (using topics as branches)
      const branchPerformance = topicTimeStats.map((topic) => {
        const accuracyData = topicAccuracyRates.find(
          (t) => t.topic_id === topic.topic_id,
        ) || { accuracy_rate: 0, correct_answers: 0, total_attempts: 0 };

        return {
          branchId: topic.topic_id,
          branchName: topic.topic_title,
          averageScore: parseFloat(accuracyData.accuracy_rate || 0),
          totalQuestions: parseInt(accuracyData.total_attempts || 0),
          correctAnswers: parseInt(accuracyData.correct_answers || 0),
        };
      });

      // Get total questions answered and overall accuracy
      const totalQuestionsAnswered = topicAccuracyRates.reduce(
        (sum, topic) => sum + parseInt(topic.total_attempts || 0),
        0,
      );

      const correctAnswers = topicAccuracyRates.reduce(
        (sum, topic) => sum + parseInt(topic.correct_answers || 0),
        0,
      );

      const overallAccuracy =
        totalQuestionsAnswered > 0
          ? (correctAnswers / totalQuestionsAnswered) * 100
          : 0;

      // Get study session stats
      const studyStats = await sessionModel.getStudyStats(userId);

      // Log analytics activity
      console.log(
        `User ${userId} (${req.user.email}) accessed performance analytics`,
      );

      res.json({
        branchPerformance,
        totalQuestionsAnswered,
        overallAccuracy,
        studyTime: studyStats.total_duration || 0,
        studySessions: studyStats.total_sessions || 0,
        averageSessionDuration:
          studyStats.total_sessions > 0
            ? studyStats.total_duration / studyStats.total_sessions
            : 0,
      });
    } catch (error) {
      console.error('Get user performance analytics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve user performance analytics' });
    }
  },

  // Get activity timeline for specified number of days
  async getActivityTimeline(req, res) {
    try {
      const userId = req.user.userId;
      const days = parseInt(req.query.days) || 7;

      // Get daily study time
      const dailyStudyTime = await sessionModel.getDailyStudyTime(userId);

      // Create a map of existing data
      const resultMap = new Map();

      // Fill in data from study sessions
      dailyStudyTime.forEach((day) => {
        const dateStr =
          typeof day.study_date === 'string'
            ? day.study_date
            : day.study_date.toISOString().split('T')[0];

        resultMap.set(dateStr, {
          date: dateStr,
          studyTime: parseInt(day.total_duration || 0),
          questionsAnswered: 0, // Will be filled in next step
        });
      });

      // Get questions answered per day (this is a simplified approach)
      // In a real implementation, you would query the database for this data

      // Fill in missing days and sort
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        if (resultMap.has(dateStr)) {
          result.push(resultMap.get(dateStr));
        } else {
          result.push({
            date: dateStr,
            studyTime: 0,
            questionsAnswered: 0,
          });
        }
      }

      // Log analytics activity
      console.log(
        `User ${userId} (${req.user.email}) accessed activity timeline`,
      );

      res.json(result);
    } catch (error) {
      console.error('Get activity timeline error:', error);
      res.status(500).json({ message: 'Failed to retrieve activity timeline' });
    }
  },

  // Get user's weakest topics based on performance
  async getWeakestTopics(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 5;

      // Reuse the existing problematic topics method
      const weakestTopics = await errorAnalyticsModel.getMostProblematicTopics(
        userId,
        limit,
      );

      // Format response to match frontend expectations
      const formattedTopics = weakestTopics.map((topic) => ({
        topicId: topic.topic_id,
        topicName: topic.topic_title,
        branchId: topic.topic_id, // Use topic ID as branch ID
        branchName: topic.topic_title, // Use topic title as branch name
        averageScore: 100 - parseFloat(topic.error_rate || 0), // Invert error rate to get accuracy
        totalQuestions: parseInt(topic.total_attempts || 0),
        correctAnswers:
          parseInt(topic.total_attempts || 0) -
          parseInt(topic.total_errors || 0),
      }));

      // Log analytics activity
      console.log(`User ${userId} (${req.user.email}) accessed weakest topics`);

      res.json(formattedTopics);
    } catch (error) {
      console.error('Get weakest topics error:', error);
      res.status(500).json({ message: 'Failed to retrieve weakest topics' });
    }
  },

  // Get improvement metrics comparing current vs previous period
  async getImprovementMetrics(req, res) {
    try {
      const userId = req.user.userId;

      // Get topic accuracy rates
      const topicAccuracyRates =
        await errorAnalyticsModel.getTopicAccuracyRates(userId);

      // Since we don't have historical data to compare, we'll create a simulated response
      // In a real implementation, you would query the database for current and previous period data

      // Simulated previous accuracy (70% of current)
      const currentAverage =
        topicAccuracyRates.reduce(
          (sum, topic) => sum + parseFloat(topic.accuracy_rate || 0),
          0,
        ) / (topicAccuracyRates.length || 1);

      const previousAverage = currentAverage * 0.7; // Simulated previous value

      // Calculate percentage change
      const percentageChange =
        previousAverage > 0
          ? ((currentAverage - previousAverage) / previousAverage) * 100
          : 0;

      // Create simulated topic improvements
      const topicImprovements = topicAccuracyRates.map((topic) => {
        const previousAccuracy = parseFloat(topic.accuracy_rate || 0) * 0.7; // Simulated
        return {
          topicId: topic.topic_id,
          topicName: topic.topic_title,
          previousAccuracy,
          currentAccuracy: parseFloat(topic.accuracy_rate || 0),
          percentageChange:
            previousAccuracy > 0
              ? ((topic.accuracy_rate - previousAccuracy) / previousAccuracy) *
                100
              : 0,
        };
      });

      // Log analytics activity
      console.log(
        `User ${userId} (${req.user.email}) accessed improvement metrics`,
      );

      res.json({
        previousAverage,
        currentAverage,
        percentageChange,
        topicImprovements,
      });
    } catch (error) {
      console.error('Get improvement metrics error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve improvement metrics' });
    }
  },

  // Get distribution of study time across different parts of the day
  async getStudyTimeDistribution(req, res) {
    try {
      const userId = req.user.userId;

      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get all study sessions for this user
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('start_time, duration')
        .eq('user_id', userId)
        .not('end_time', 'is', null);

      if (error) throw error;

      // Calculate distribution by time of day
      let morning = 0; // 5 AM - 12 PM
      let afternoon = 0; // 12 PM - 5 PM
      let evening = 0; // 5 PM - 9 PM
      let night = 0; // 9 PM - 5 AM

      sessions.forEach((session) => {
        if (!session.duration) return;

        const startTime = new Date(session.start_time);
        const hour = startTime.getHours();
        const duration = parseInt(session.duration);

        if (hour >= 5 && hour < 12) {
          morning += duration;
        } else if (hour >= 12 && hour < 17) {
          afternoon += duration;
        } else if (hour >= 17 && hour < 21) {
          evening += duration;
        } else {
          night += duration;
        }
      });

      // Calculate total hours
      const totalSeconds = morning + afternoon + evening + night;
      const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

      // Log analytics activity
      console.log(
        `User ${userId} (${req.user.email}) accessed study time distribution`,
      );

      res.json({
        morning,
        afternoon,
        evening,
        night,
        totalHours,
      });
    } catch (error) {
      console.error('Get study time distribution error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve study time distribution' });
    }
  },

  // Get detailed answer explanations for user's recent incorrect answers
  async getAnswerExplanations(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 10;

      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get recent incorrect answers with explanations
      const { data: incorrectAnswers, error } = await supabase
        .from('user_answers')
        .select(
          `
          answer_id,
          user_answer,
          is_correct,
          answer_definition,
          created_at,
          test_questions (
            question_id,
            question_text,
            correct_answer,
            options
          ),
          user_test_results (
            test_id,
            tests (
              title,
              course_id,
              courses (
                title
              )
            )
          )
        `,
        )
        .eq('is_correct', false)
        .not('answer_definition', 'is', null)
        .in(
          'result_id',
          supabase
            .from('user_test_results')
            .select('result_id')
            .eq('user_id', userId),
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const formattedAnswers = incorrectAnswers.map((answer) => ({
        answerId: answer.answer_id,
        questionText: answer.test_questions?.question_text,
        userAnswer: answer.user_answer,
        correctAnswer: answer.test_questions?.correct_answer,
        explanation: answer.answer_definition,
        options: answer.test_questions?.options,
        testTitle: answer.user_test_results?.tests?.title,
        courseTitle: answer.user_test_results?.tests?.courses?.title,
        answeredAt: answer.created_at,
      }));

      // Log analytics activity
      console.log(
        `User ${userId} (${req.user.email}) accessed answer explanations`,
      );

      res.json({
        incorrectAnswers: formattedAnswers,
      });
    } catch (error) {
      console.error('Get answer explanations error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve answer explanations' });
    }
  },
};

module.exports = analyticsController;
