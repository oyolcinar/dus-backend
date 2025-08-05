const notificationService = require('./notificationService');
const achievementService = require('./achievementService');

/**
 * Notification Helper Functions (Course-Based System)
 * These functions provide easy-to-use interfaces for sending specific types of notifications
 * Updated with full achievement integration and course-based study tracking
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

  // UPDATED: Course study session completed notification with achievement check
  static async handleCourseStudySessionCompleted(userId, sessionData) {
    try {
      console.log(
        `🎓 Handling course study session completion for user ${userId}`,
      );
      console.log('📊 Session data:', {
        courseId: sessionData.courseId,
        studyDurationSeconds: sessionData.studyDurationSeconds,
        breakDurationSeconds: sessionData.breakDurationSeconds,
        sessionDate: sessionData.sessionDate,
      });

      // Trigger achievement check after course study session
      const newAchievements = await achievementService.triggerAchievementCheck(
        userId,
        'course_study_session_completed', // ✅ UPDATED ACTION TYPE
      );

      console.log(
        `🏆 User ${userId} earned ${newAchievements.length} achievements after course study session`,
      );

      // Optional: Send study completion notification
      if (sessionData.studyDurationSeconds > 1800) {
        // > 30 minutes
        try {
          await notificationService.sendNotification(
            userId,
            'study_reminder',
            'study_session_completed',
            {
              course_title: sessionData.courseTitle || 'Course',
              study_duration_minutes: Math.round(
                sessionData.studyDurationSeconds / 60,
              ),
              break_duration_minutes: Math.round(
                (sessionData.breakDurationSeconds || 0) / 60,
              ),
            },
          );
        } catch (notificationError) {
          console.error(
            'Error sending study completion notification:',
            notificationError,
          );
          // Don't throw - notification failure shouldn't break achievement check
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error handling course study session completion:', error);
      throw error;
    }
  }

  // NEW: Course completion handler with achievement check
  static async handleCourseCompletion(userId, courseData) {
    try {
      console.log(`🎯 Handling course completion for user ${userId}`);
      console.log('📚 Course data:', {
        courseId: courseData.courseId,
        courseTitle: courseData.courseTitle,
        completionPercentage: courseData.completionPercentage,
      });

      // Trigger achievement check after course completion
      const newAchievements = await achievementService.triggerAchievementCheck(
        userId,
        'course_completed', // ✅ NEW ACTION TYPE
      );

      console.log(
        `🏆 User ${userId} earned ${newAchievements.length} achievements after completing course`,
      );

      // Send course completion notification
      try {
        await notificationService.sendNotification(
          userId,
          'achievement_unlock',
          'course_completed',
          {
            course_title: courseData.courseTitle,
            course_id: courseData.courseId,
            completion_date: new Date().toISOString(),
          },
        );
      } catch (notificationError) {
        console.error(
          'Error sending course completion notification:',
          notificationError,
        );
        // Don't throw - notification failure shouldn't break achievement check
      }

      return newAchievements;
    } catch (error) {
      console.error('Error handling course completion:', error);
      throw error;
    }
  }

  // LEGACY: Study session completed (redirects to course-based handler)
  static async handleStudySessionCompleted(userId, sessionData) {
    console.log(
      `⚠️ Legacy handleStudySessionCompleted called - redirecting to course-based handler`,
    );

    // Convert legacy session data to course session data format
    const courseSessionData = {
      courseId: sessionData.courseId || sessionData.course_id,
      courseTitle: sessionData.courseTitle || sessionData.course_title,
      studyDurationSeconds:
        sessionData.studyDurationSeconds || sessionData.duration_seconds,
      breakDurationSeconds: sessionData.breakDurationSeconds || 0,
      sessionDate: sessionData.sessionDate || sessionData.session_date,
    };

    return await this.handleCourseStudySessionCompleted(
      userId,
      courseSessionData,
    );
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
      console.log(
        '🔍 Running achievement check for all users (course-based system)...',
      );

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
      console.log(
        `🧪 Manual achievement check triggered for user ${userId} (course-based)`,
      );

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
      console.log('📊 Getting achievement statistics (course-based system)...');

      const stats = await achievementService.getAchievementStats();

      console.log('📈 Achievement stats retrieved:', stats);
      return stats;
    } catch (error) {
      console.error('Error getting achievement statistics:', error);
      throw error;
    }
  }

  // UPDATED: Schedule recurring notifications with course-based data
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
          users!inner(username)
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
          // UPDATED: Get course-based study streak
          try {
            const userStats = await achievementService.getUserStats(
              pref.user_id,
            );

            notifications.push({
              userId: pref.user_id,
              notificationType: 'study_reminder',
              templateName: 'daily_study_reminder',
              variables: {
                streak_days: userStats.current_study_streak || 0,
                total_courses_studied: userStats.courses_studied || 0,
                total_study_hours: Math.round(
                  (userStats.total_course_study_time_seconds || 0) / 3600,
                ),
              },
            });
          } catch (statsError) {
            console.error(
              `Error getting stats for user ${pref.user_id}:`,
              statsError,
            );
            // Fallback notification without stats
            notifications.push({
              userId: pref.user_id,
              notificationType: 'study_reminder',
              templateName: 'daily_study_reminder',
              variables: { streak_days: 0 },
            });
          }
        }
      }

      if (notifications.length > 0) {
        console.log(
          `📤 Sending ${notifications.length} scheduled study reminders (course-based)`,
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
          activity_title: 'Günlük Ders Çalışma Etkinliği',
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

  // UPDATED: Send streak reminders based on course study data
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

      const notifications = [];

      // Get streak data for each user
      for (const pref of preferences) {
        try {
          const userStats = await achievementService.getUserStats(pref.user_id);

          // Only send streak reminder if user has a streak >= 3 days
          if (userStats.current_study_streak >= 3) {
            notifications.push({
              userId: pref.user_id,
              notificationType: 'streak_reminder',
              templateName: 'streak_warning',
              variables: {
                streak_days: userStats.current_study_streak,
                streak_type: 'course_study',
                total_courses: userStats.courses_studied || 0,
              },
            });
          }
        } catch (statsError) {
          console.error(
            `Error getting streak for user ${pref.user_id}:`,
            statsError,
          );
        }
      }

      if (notifications.length > 0) {
        console.log(
          `🔥 Sending ${notifications.length} streak reminders (course-based)`,
        );
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
      console.log(
        `🧪 Sending test notification to user ${userId} (course-based system)`,
      );

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

  // NEW: Course-specific notification helpers
  static async sendCourseSpecificNotification(
    userId,
    courseId,
    notificationType,
    templateName,
    variables = {},
  ) {
    try {
      console.log(
        `📚 Sending course-specific notification for user ${userId}, course ${courseId}`,
      );

      // Get course details
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: course, error } = await supabase
        .from('courses')
        .select('title, description, course_type')
        .eq('course_id', courseId)
        .single();

      if (error) throw error;

      // Add course data to variables
      const enhancedVariables = {
        ...variables,
        course_id: courseId,
        course_title: course.title,
        course_description: course.description,
        course_type: course.course_type,
      };

      return await notificationService.sendNotification(
        userId,
        notificationType,
        templateName,
        enhancedVariables,
      );
    } catch (error) {
      console.error('Error sending course-specific notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationHelpers;
