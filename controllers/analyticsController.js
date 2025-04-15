const { sessionModel, errorAnalyticsModel } = require('../models/studyModels');
const userModel = require('../models/userModel');
const duelResultModel = require('../models/duelResultModel');

const analyticsController = {
  // Get user's dashboard analytics
  async getUserDashboard(req, res) {
    try {
      const userId = req.user.userId;

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

      res.json({
        topicAnalytics,
      });
    } catch (error) {
      console.error('Get topic analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve topic analytics' });
    }
  },
};

module.exports = analyticsController;
