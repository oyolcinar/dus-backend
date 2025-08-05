const notificationService = require('./notificationService');
const achievementService = require('./achievementService');

/**
 * Notification Helper Functions
 * These functions provide easy-to-use interfaces for sending specific types of notifications
 * Updated with full achievement integration and enhanced error handling
 */

class NotificationHelpers {
  // Achievement notification
  static async sendAchievementNotification(
    userId,
    achievementName,
    achievementId,
  ) {
    try {
      return await notificationService.sendNotification(
        userId,
        'achievement_unlock',
        'achievement_unlock',
        {
          achievement_name: achievementName,
          achievement_id: achievementId,
        },
      );
    } catch (error) {
      console.error('Error sending achievement notification:', error);
      throw error;
    }
  }

  // Duel invitation notification
  static async sendDuelInvitationNotification(
    opponentId,
    challengerName,
    challengerId,
    topicName,
    duelId,
  ) {
    try {
      return await notificationService.sendNotification(
        opponentId,
        'duel_invitation',
        'duel_invitation',
        {
          challenger_name: challengerName,
          challenger_id: challengerId,
          topic_name: topicName,
          duel_id: duelId,
        },
      );
    } catch (error) {
      console.error('Error sending duel invitation notification:', error);
      throw error;
    }
  }

  // UPDATED: Duel result notification (winner) - Enhanced with achievement check
  static async sendDuelWinnerNotification(
    winnerId,
    opponentName,
    yourScore,
    opponentScore,
    duelId,
  ) {
    try {
      const notification = await notificationService.sendNotification(
        winnerId,
        'duel_result',
        'duel_result_winner',
        {
          opponent_name: opponentName,
          your_score: yourScore,
          opponent_score: opponentScore,
          duel_id: duelId,
        },
      );

      // Enhanced achievement check after duel completion
      try {
        const newAchievements =
          await achievementService.triggerAchievementCheck(
            winnerId,
            'duel_completed',
          );
        console.log(
          `🏆 User ${winnerId} earned ${newAchievements.length} achievements after duel win`,
        );
      } catch (achievementError) {
        console.error(
          'Error checking achievements after duel win:',
          achievementError,
        );
        // Don't throw - achievement check failure shouldn't break duel notification
      }

      return notification;
    } catch (error) {
      console.error('Error sending duel winner notification:', error);
      throw error;
    }
  }

  // UPDATED: Duel result notification (loser) - Enhanced with achievement check
  static async sendDuelLoserNotification(
    loserId,
    opponentName,
    yourScore,
    opponentScore,
    duelId,
  ) {
    try {
      const notification = await notificationService.sendNotification(
        loserId,
        'duel_result',
        'duel_result_loser',
        {
          opponent_name: opponentName,
          your_score: yourScore,
          opponent_score: opponentScore,
          duel_id: duelId,
        },
      );

      // Enhanced achievement check after duel completion
      try {
        const newAchievements =
          await achievementService.triggerAchievementCheck(
            loserId,
            'duel_completed',
          );
        console.log(
          `🏆 User ${loserId} earned ${newAchievements.length} achievements after duel loss`,
        );
      } catch (achievementError) {
        console.error(
          'Error checking achievements after duel loss:',
          achievementError,
        );
        // Don't throw - achievement check failure shouldn't break duel notification
      }

      return notification;
    } catch (error) {
      console.error('Error sending duel loser notification:', error);
      throw error;
    }
  }

  // Friend request notification
  static async sendFriendRequestNotification(
    recipientId,
    requesterName,
    requesterId,
  ) {
    try {
      return await notificationService.sendNotification(
        recipientId,
        'friend_request',
        'friend_request',
        {
          requester_name: requesterName,
          requester_id: requesterId,
        },
      );
    } catch (error) {
      console.error('Error sending friend request notification:', error);
      throw error;
    }
  }

  // Friend activity notification
  static async sendFriendActivityNotification(
    userId,
    friendName,
    activityType,
    activityDetails,
  ) {
    try {
      return await notificationService.sendNotification(
        userId,
        'friend_activity',
        'friend_activity',
        {
          friend_name: friendName,
          activity_type: activityType,
          activity_details: activityDetails,
        },
      );
    } catch (error) {
      console.error('Error sending friend activity notification:', error);
      throw error;
    }
  }

  // Study reminder notification
  static async sendStudyReminderNotification(userId, streakDays = 0) {
    try {
      return await notificationService.sendNotification(
        userId,
        'study_reminder',
        'daily_study_reminder',
        {
          streak_days: streakDays,
        },
      );
    } catch (error) {
      console.error('Error sending study reminder notification:', error);
      throw error;
    }
  }

  // Study plan reminder notification
  static async sendStudyPlanReminderNotification(
    userId,
    activityTitle,
    planId,
  ) {
    try {
      return await notificationService.sendNotification(
        userId,
        'plan_reminder',
        'study_plan_reminder',
        {
          activity_title: activityTitle,
          plan_id: planId,
        },
      );
    } catch (error) {
      console.error('Error sending study plan reminder notification:', error);
      throw error;
    }
  }

  // Streak reminder notification
  static async sendStreakReminderNotification(userId, streakDays, streakType) {
    try {
      return await notificationService.sendNotification(
        userId,
        'streak_reminder',
        'streak_reminder',
        {
          streak_days: streakDays,
          streak_type: streakType,
        },
      );
    } catch (error) {
      console.error('Error sending streak reminder notification:', error);
      throw error;
    }
  }

  // Coaching note notification
  static async sendCoachingNoteNotification(userId, noteTitle, noteId) {
    try {
      return await notificationService.sendNotification(
        userId,
        'coaching_note',
        'coaching_note',
        {
          note_title: noteTitle,
          note_id: noteId,
        },
      );
    } catch (error) {
      console.error('Error sending coaching note notification:', error);
      throw error;
    }
  }

  // Motivational message notification
  static async sendMotivationalMessageNotification(
    userId,
    messageTitle,
    messageId,
  ) {
    try {
      return await notificationService.sendNotification(
        userId,
        'motivational_message',
        'motivational_message',
        {
          message_title: messageTitle,
          message_id: messageId,
        },
      );
    } catch (error) {
      console.error('Error sending motivational message notification:', error);
      throw error;
    }
  }

  // System announcement notification
  static async sendSystemAnnouncementNotification(
    userId,
    announcementTitle,
    announcementContent,
  ) {
    try {
      return await notificationService.sendNotification(
        userId,
        'system_announcement',
        'system_announcement',
        {
          announcement_title: announcementTitle,
          announcement_content: announcementContent,
        },
      );
    } catch (error) {
      console.error('Error sending system announcement notification:', error);
      throw error;
    }
  }

  // Content update notification
  static async sendContentUpdateNotification(
    userId,
    contentType,
    contentTitle,
    contentId,
  ) {
    try {
      return await notificationService.sendNotification(
        userId,
        'content_update',
        'content_update',
        {
          content_type: contentType,
          content_title: contentTitle,
          content_id: contentId,
        },
      );
    } catch (error) {
      console.error('Error sending content update notification:', error);
      throw error;
    }
  }

  // ENHANCED: Study session completed notification with achievement check
  static async handleStudySessionCompleted(userId, sessionData) {
    try {
      console.log(`🎓 Handling study session completion for user ${userId}`);

      // Trigger achievement check after study session
      const newAchievements = await achievementService.triggerAchievementCheck(
        userId,
        'study_session_completed',
      );

      console.log(
        `🏆 User ${userId} earned ${newAchievements.length} achievements after study session`,
      );
      return newAchievements;
    } catch (error) {
      console.error('Error handling study session completion:', error);
      throw error;
    }
  }

  // ENHANCED: User registration completed with achievement check
  static async handleUserRegistration(userId) {
    try {
      console.log(`👋 Handling user registration for user ${userId}`);

      // Initialize default notification preferences
      await notificationService.initializeDefaultPreferences(userId);

      // Check for registration achievement (should award "Acemi Düşüyer")
      const newAchievements = await achievementService.triggerAchievementCheck(
        userId,
        'user_registered',
      );

      console.log(
        `🏆 User ${userId} earned ${newAchievements.length} achievements on registration`,
      );
      return newAchievements;
    } catch (error) {
      console.error('Error handling user registration:', error);
      throw error;
    }
  }

  // ENHANCED: Check achievements for all users (for cron job)
  static async checkAllUsersAchievements() {
    try {
      console.log('🔍 Running achievement check for all users...');

      const results = await achievementService.checkAllUsersAchievements();

      console.log('🎯 Achievement check completed:', results.summary);
      return results;
    } catch (error) {
      console.error('Error checking all users achievements:', error);
      throw error;
    }
  }

  // NEW: Manual achievement check helper for testing
  static async triggerManualAchievementCheck(userId) {
    try {
      console.log(`🧪 Manual achievement check triggered for user ${userId}`);

      const newAchievements = await achievementService.manualAchievementCheck(
        userId,
      );

      if (newAchievements.length > 0) {
        console.log(
          `🎉 Manual check resulted in ${newAchievements.length} new achievements for user ${userId}`,
        );
      } else {
        console.log(`📋 No new achievements for user ${userId}`);
      }

      return newAchievements;
    } catch (error) {
      console.error('Error in manual achievement check:', error);
      throw error;
    }
  }

  // NEW: Achievement statistics helper
  static async getAchievementStatistics() {
    try {
      console.log('📊 Getting achievement statistics...');

      const stats = await achievementService.getAchievementStats();

      console.log('📈 Achievement stats retrieved:', stats);
      return stats;
    } catch (error) {
      console.error('Error getting achievement statistics:', error);
      throw error;
    }
  }

  // Enhanced: Schedule recurring notifications with better error handling
  static async scheduleRecurringNotifications() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get users with study reminders enabled
      const { data: preferences, error } = await supabase
        .from('user_notification_preferences')
        .select(
          `
          user_id,
          frequency_hours,
          updated_at,
          users!inner(username, total_study_time)
        `,
        )
        .eq('notification_type', 'study_reminder')
        .eq('in_app_enabled', true)
        .or('push_enabled.eq.true,email_enabled.eq.true');

      if (error) throw error;

      const now = new Date();
      const notifications = [];

      for (const pref of preferences) {
        const lastUpdated = new Date(pref.updated_at);
        const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);

        if (hoursSinceUpdate >= pref.frequency_hours) {
          notifications.push({
            userId: pref.user_id,
            notificationType: 'study_reminder',
            templateName: 'daily_study_reminder',
            variables: {
              streak_days: Math.floor(pref.users.total_study_time / 3600) || 0,
            },
          });
        }
      }

      if (notifications.length > 0) {
        console.log(
          `📤 Sending ${notifications.length} scheduled study reminders`,
        );
        return await notificationService.sendBulkNotifications(notifications);
      }

      return { successful: 0, failed: 0, results: [] };
    } catch (error) {
      console.error('Error scheduling recurring notifications:', error);
      throw error;
    }
  }

  // Enhanced: Send daily motivation messages
  static async sendDailyMotivationMessages() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get users who want motivational messages
      const { data: preferences, error: prefError } = await supabase
        .from('user_notification_preferences')
        .select('user_id')
        .eq('notification_type', 'motivational_message')
        .eq('in_app_enabled', true)
        .or('push_enabled.eq.true,email_enabled.eq.true');

      if (prefError) throw prefError;

      const notifications = preferences.map((pref) => ({
        userId: pref.user_id,
        notificationType: 'motivational_message',
        templateName: 'new_motivational_message',
        variables: {
          message_title: 'Günlük Motivasyon',
          message_id: Date.now(),
        },
      }));

      if (notifications.length > 0) {
        console.log(`🌟 Sending ${notifications.length} motivational messages`);
        return await notificationService.sendBulkNotifications(notifications);
      }

      return { successful: 0, failed: 0, results: [] };
    } catch (error) {
      console.error('Error sending daily motivation messages:', error);
      throw error;
    }
  }

  // Enhanced: Send weekly coaching notes
  static async sendWeeklyCoachingNotes() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get current week number
      const currentDate = new Date();
      const weekNumber = Math.ceil(currentDate.getDate() / 7);

      // Get users who want coaching notes
      const { data: preferences, error: prefError } = await supabase
        .from('user_notification_preferences')
        .select('user_id')
        .eq('notification_type', 'coaching_note')
        .eq('in_app_enabled', true)
        .or('push_enabled.eq.true,email_enabled.eq.true');

      if (prefError) throw prefError;

      const notifications = preferences.map((pref) => ({
        userId: pref.user_id,
        notificationType: 'coaching_note',
        templateName: 'new_coaching_note',
        variables: {
          note_title: `Hafta ${weekNumber} Koçluk Notu`,
          week_number: weekNumber,
          note_id: Date.now(),
        },
      }));

      if (notifications.length > 0) {
        console.log(`🏆 Sending ${notifications.length} coaching notes`);
        return await notificationService.sendBulkNotifications(notifications);
      }

      return { successful: 0, failed: 0, results: [] };
    } catch (error) {
      console.error('Error sending weekly coaching notes:', error);
      throw error;
    }
  }

  // Enhanced: Send study plan reminders for today's activities
  static async sendStudyPlanReminders() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get users who want plan reminders
      const { data: preferences, error: prefError } = await supabase
        .from('user_notification_preferences')
        .select('user_id')
        .eq('notification_type', 'plan_reminder')
        .eq('in_app_enabled', true)
        .or('push_enabled.eq.true,email_enabled.eq.true');

      if (prefError) throw prefError;

      const notifications = preferences.map((pref) => ({
        userId: pref.user_id,
        notificationType: 'plan_reminder',
        templateName: 'study_plan_reminder',
        variables: {
          activity_title: 'Günlük Çalışma Etkinliği',
          plan_id: Date.now(),
        },
      }));

      if (notifications.length > 0) {
        console.log(`📅 Sending ${notifications.length} study plan reminders`);
        return await notificationService.sendBulkNotifications(notifications);
      }

      return { successful: 0, failed: 0, results: [] };
    } catch (error) {
      console.error('Error sending study plan reminders:', error);
      throw error;
    }
  }

  // Enhanced: Send streak reminders for users with long streaks
  static async sendStreakReminders() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get users who want streak reminders
      const { data: preferences, error: prefError } = await supabase
        .from('user_notification_preferences')
        .select('user_id')
        .eq('notification_type', 'streak_reminder')
        .eq('in_app_enabled', true)
        .or('push_enabled.eq.true,email_enabled.eq.true');

      if (prefError) throw prefError;

      const notifications = preferences.map((pref) => ({
        userId: pref.user_id,
        notificationType: 'streak_reminder',
        templateName: 'streak_warning',
        variables: {
          streak_days: 7,
          streak_type: 'study',
        },
      }));

      if (notifications.length > 0) {
        console.log(`🔥 Sending ${notifications.length} streak reminders`);
        return await notificationService.sendBulkNotifications(notifications);
      }

      return { successful: 0, failed: 0, results: [] };
    } catch (error) {
      console.error('Error sending streak reminders:', error);
      throw error;
    }
  }

  // Clean up old notifications
  static async cleanupOldNotifications(daysOld = 90) {
    try {
      const notificationModel = require('../models/notificationModel');
      const deletedNotifications =
        await notificationModel.cleanupOldNotifications(daysOld);

      console.log(
        `🧹 Cleaned up ${deletedNotifications.length} old notifications`,
      );
      return deletedNotifications;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  // Process pending notifications (for background jobs)
  static async processPendingNotifications() {
    try {
      return await notificationService.processPendingNotifications();
    } catch (error) {
      console.error('Error processing pending notifications:', error);
      throw error;
    }
  }

  // Enhanced: Send system announcement to all users
  static async sendSystemAnnouncementToAll(
    announcementTitle,
    announcementContent,
  ) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get all active users
      const { data: users, error } = await supabase
        .from('users')
        .select('user_id')
        .order('user_id');

      if (error) throw error;

      const notifications = users.map((user) => ({
        userId: user.user_id,
        notificationType: 'system_announcement',
        templateName: 'system_announcement',
        variables: {
          announcement_title: announcementTitle,
          announcement_content: announcementContent,
        },
      }));

      console.log(
        `📢 Sending system announcement to ${notifications.length} users`,
      );
      return await notificationService.sendBulkNotifications(notifications);
    } catch (error) {
      console.error('Error sending system announcement to all users:', error);
      throw error;
    }
  }

  // Send bulk notifications
  static async sendBulkNotifications(notifications) {
    try {
      return await notificationService.sendBulkNotifications(notifications);
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // NEW: Emergency notification for all users
  static async sendEmergencyNotification(title, message, targetUsers = 'all') {
    try {
      console.log('🚨 Sending emergency notification...');

      if (targetUsers === 'all') {
        return await this.sendSystemAnnouncementToAll(title, message);
      } else if (Array.isArray(targetUsers)) {
        const notifications = targetUsers.map((userId) => ({
          userId,
          notificationType: 'system_announcement',
          templateName: 'system_announcement',
          variables: {
            announcement_title: title,
            announcement_content: message,
          },
        }));
        return await this.sendBulkNotifications(notifications);
      }
    } catch (error) {
      console.error('Error sending emergency notification:', error);
      throw error;
    }
  }

  // NEW: Send test notification for specific user
  static async sendTestNotification(userId, message = 'Test notification') {
    try {
      console.log(`🧪 Sending test notification to user ${userId}`);

      return await notificationService.sendNotification(
        userId,
        'system_announcement',
        'system_announcement',
        {
          announcement_title: 'Test Bildirimi',
          announcement_content: message,
        },
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationHelpers;
