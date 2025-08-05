const cron = require('node-cron');
const NotificationHelpers = require('./notificationHelpers');
const deviceTokenModel = require('../models/deviceTokenModel');

class NotificationCronJobs {
  constructor() {
    this.jobs = [];
  }

  // Initialize all cron jobs
  init() {
    console.log('Initializing enhanced notification cron jobs...');

    // Daily study reminders - 9 AM every day
    this.scheduleStudyReminders();

    // Daily motivational messages - 8 AM every day
    this.scheduleMotivationalMessages();

    // Weekly coaching notes - Monday 10 AM
    this.scheduleWeeklyCoachingNotes();

    // Study plan reminders - 9 AM every day
    this.scheduleStudyPlanReminders();

    // Streak reminders - Every 3 days at 7 PM
    this.scheduleStreakReminders();

    // Achievement checking - Every 6 hours
    this.scheduleAchievementChecking();

    // Process pending notifications - Every 5 minutes
    this.schedulePendingNotificationProcessor();

    // ENHANCED: Device token cleanup - Every 6 hours
    this.scheduleDeviceTokenCleanup();

    // ENHANCED: Stale token detection - Daily at 3 AM
    this.scheduleStaleTokenDetection();

    // Cleanup old notifications - Every Sunday at 2 AM
    this.scheduleNotificationCleanup();

    // ENHANCED: Weekly comprehensive maintenance - Sunday at 4 AM
    this.scheduleWeeklyMaintenance();

    console.log(
      `${this.jobs.length} enhanced notification cron jobs initialized`,
    );
  }

  // Schedule daily study reminders
  scheduleStudyReminders() {
    const job = cron.schedule(
      '0 9 * * *',
      async () => {
        console.log('Running daily study reminders job...');
        try {
          const result =
            await NotificationHelpers.scheduleRecurringNotifications();
          console.log(
            `Study reminders sent: ${result.successful} successful, ${result.failed} failed`,
          );
        } catch (error) {
          console.error('Error in study reminders cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'daily_study_reminders',
      schedule: '0 9 * * *',
      job,
    });
  }

  // Schedule daily motivational messages
  scheduleMotivationalMessages() {
    const job = cron.schedule(
      '0 8 * * *',
      async () => {
        console.log('Running daily motivational messages job...');
        try {
          const result =
            await NotificationHelpers.sendDailyMotivationMessages();
          console.log(
            `Motivational messages sent: ${result.successful} successful, ${result.failed} failed`,
          );
        } catch (error) {
          console.error('Error in motivational messages cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'daily_motivational_messages',
      schedule: '0 8 * * *',
      job,
    });
  }

  // Schedule weekly coaching notes
  scheduleWeeklyCoachingNotes() {
    const job = cron.schedule(
      '0 10 * * 1',
      async () => {
        console.log('Running weekly coaching notes job...');
        try {
          const result = await NotificationHelpers.sendWeeklyCoachingNotes();
          console.log(
            `Coaching notes sent: ${result.successful} successful, ${result.failed} failed`,
          );
        } catch (error) {
          console.error('Error in coaching notes cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'weekly_coaching_notes',
      schedule: '0 10 * * 1',
      job,
    });
  }

  // Schedule study plan reminders
  scheduleStudyPlanReminders() {
    const job = cron.schedule(
      '0 9 * * *',
      async () => {
        console.log('Running study plan reminders job...');
        try {
          const result = await NotificationHelpers.sendStudyPlanReminders();
          console.log(
            `Study plan reminders sent: ${result.successful} successful, ${result.failed} failed`,
          );
        } catch (error) {
          console.error('Error in study plan reminders cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'study_plan_reminders',
      schedule: '0 9 * * *',
      job,
    });
  }

  // Schedule streak reminders
  scheduleStreakReminders() {
    const job = cron.schedule(
      '0 19 */3 * *',
      async () => {
        console.log('Running streak reminders job...');
        try {
          const result = await NotificationHelpers.sendStreakReminders();
          console.log(
            `Streak reminders sent: ${result.successful} successful, ${result.failed} failed`,
          );
        } catch (error) {
          console.error('Error in streak reminders cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'streak_reminders',
      schedule: '0 19 */3 * *',
      job,
    });
  }

  // Schedule achievement checking
  scheduleAchievementChecking() {
    const job = cron.schedule(
      '0 */6 * * *', // Every 6 hours
      async () => {
        console.log('Running achievement checking job...');
        try {
          const result = await NotificationHelpers.checkAllUsersAchievements();
          console.log(
            `Achievement check completed: ${result.summary.totalNewAchievements} new achievements awarded to ${result.summary.successfulChecks} users`,
          );
        } catch (error) {
          console.error('Error in achievement checking cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'achievement_checking',
      schedule: '0 */6 * * *',
      job,
    });
  }

  // Schedule pending notification processor
  schedulePendingNotificationProcessor() {
    const job = cron.schedule(
      '*/5 * * * *',
      async () => {
        console.log('Processing pending notifications...');
        try {
          await NotificationHelpers.processPendingNotifications();
        } catch (error) {
          console.error('Error in pending notifications processor:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'pending_notifications_processor',
      schedule: '*/5 * * * *',
      job,
    });
  }

  // ENHANCED: Schedule device token cleanup
  scheduleDeviceTokenCleanup() {
    const job = cron.schedule(
      '0 */6 * * *', // Every 6 hours
      async () => {
        console.log('Running device token cleanup job...');
        try {
          // Clean up duplicate tokens for all users
          const { createClient } = require('@supabase/supabase-js');
          const { supabaseUrl, supabaseKey } = require('../config/supabase');
          const supabase = createClient(supabaseUrl, supabaseKey);

          // Get all users with multiple active tokens
          const { data: users, error } = await supabase
            .from('user_notification_tokens')
            .select('user_id')
            .eq('is_active', true)
            .group('user_id');

          if (error) throw error;

          let totalCleaned = 0;
          for (const user of users || []) {
            const result = await deviceTokenModel.cleanupDuplicateTokens(
              user.user_id,
            );
            totalCleaned += result.cleaned_count;
          }

          // Clean old inactive tokens (older than 30 days)
          const deletedTokens = await deviceTokenModel.deleteOldTokens(30);

          console.log(
            `🧹 Device token cleanup completed: ${totalCleaned} duplicates cleaned, ${deletedTokens.length} old tokens deleted`,
          );
        } catch (error) {
          console.error('Error in device token cleanup cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'device_token_cleanup',
      schedule: '0 */6 * * *',
      job,
    });
  }

  // ENHANCED: Schedule stale token detection
  scheduleStaleTokenDetection() {
    const job = cron.schedule(
      '0 3 * * *', // Daily at 3 AM
      async () => {
        console.log('Running stale token detection job...');
        try {
          // Find tokens that haven't been used in 60 days
          const staleTokens = await deviceTokenModel.getStaleTokens(60);

          if (staleTokens.length > 0) {
            console.log(`🔍 Found ${staleTokens.length} stale tokens`);

            // Test a sample of stale tokens
            const sampleSize = Math.min(10, staleTokens.length);
            const sampleTokens = staleTokens.slice(0, sampleSize);

            let invalidCount = 0;
            for (const token of sampleTokens) {
              const testResult = await deviceTokenModel.testToken(
                token.device_token,
              );
              if (!testResult.valid) {
                await deviceTokenModel.disableToken(
                  token.device_token,
                  'stale_invalid',
                );
                invalidCount++;
              }
            }

            console.log(
              `📊 Stale token detection: ${invalidCount}/${sampleSize} sample tokens were invalid and disabled`,
            );
          } else {
            console.log('✅ No stale tokens found');
          }
        } catch (error) {
          console.error('Error in stale token detection cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'stale_token_detection',
      schedule: '0 3 * * *',
      job,
    });
  }

  // Schedule notification cleanup
  scheduleNotificationCleanup() {
    const job = cron.schedule(
      '0 2 * * 0',
      async () => {
        console.log('Running notification cleanup job...');
        try {
          const result = await NotificationHelpers.cleanupOldNotifications(90);
          console.log(`Cleaned up ${result.length} old notifications`);
        } catch (error) {
          console.error('Error in notification cleanup cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'notification_cleanup',
      schedule: '0 2 * * 0',
      job,
    });
  }

  // ENHANCED: Schedule weekly comprehensive maintenance
  scheduleWeeklyMaintenance() {
    const job = cron.schedule(
      '0 4 * * 0', // Every Sunday at 4 AM
      async () => {
        console.log('Running weekly comprehensive maintenance job...');
        try {
          const maintenanceResults = {
            tokenCleanup: 0,
            tokenDeletion: 0,
            notificationCleanup: 0,
            achievementCheck: 0,
            errors: [],
          };

          // 1. Comprehensive token cleanup
          try {
            const { createClient } = require('@supabase/supabase-js');
            const { supabaseUrl, supabaseKey } = require('../config/supabase');
            const supabase = createClient(supabaseUrl, supabaseKey);

            // Call the maintenance function
            const { data: results, error } = await supabase.rpc(
              'maintain_device_tokens',
            );
            if (error) throw error;

            results.forEach((result) => {
              if (result.action === 'deleted_old_tokens') {
                maintenanceResults.tokenDeletion = result.count;
              } else if (result.action === 'disabled_stale_tokens') {
                maintenanceResults.tokenCleanup = result.count;
              }
            });
          } catch (error) {
            console.error('Error in token maintenance:', error);
            maintenanceResults.errors.push(
              'token_maintenance: ' + error.message,
            );
          }

          // 2. Notification cleanup
          try {
            const notificationResult =
              await NotificationHelpers.cleanupOldNotifications(90);
            maintenanceResults.notificationCleanup = notificationResult.length;
          } catch (error) {
            console.error('Error in notification cleanup:', error);
            maintenanceResults.errors.push(
              'notification_cleanup: ' + error.message,
            );
          }

          // 3. Comprehensive achievement check
          try {
            const achievementResult =
              await NotificationHelpers.checkAllUsersAchievements();
            maintenanceResults.achievementCheck =
              achievementResult.summary.totalNewAchievements;
          } catch (error) {
            console.error('Error in achievement check:', error);
            maintenanceResults.errors.push(
              'achievement_check: ' + error.message,
            );
          }

          // 4. Generate maintenance report
          console.log('🔧 Weekly maintenance completed:', {
            tokens_cleaned: maintenanceResults.tokenCleanup,
            tokens_deleted: maintenanceResults.tokenDeletion,
            notifications_cleaned: maintenanceResults.notificationCleanup,
            achievements_awarded: maintenanceResults.achievementCheck,
            errors: maintenanceResults.errors.length,
          });

          // 5. Send maintenance report to admins (optional)
          if (process.env.ADMIN_USER_IDS) {
            const adminIds = process.env.ADMIN_USER_IDS.split(',').map((id) =>
              parseInt(id.trim()),
            );
            const reportMessage = `Haftalık bakım tamamlandı:
• ${maintenanceResults.tokenCleanup} token temizlendi
• ${maintenanceResults.tokenDeletion} eski token silindi  
• ${maintenanceResults.notificationCleanup} eski bildirim silindi
• ${maintenanceResults.achievementCheck} yeni başarı verildi
• ${maintenanceResults.errors.length} hata`;

            for (const adminId of adminIds) {
              try {
                await NotificationHelpers.sendTestNotification(
                  adminId,
                  reportMessage,
                );
              } catch (error) {
                console.error(
                  `Error sending maintenance report to admin ${adminId}:`,
                  error,
                );
              }
            }
          }
        } catch (error) {
          console.error('Error in weekly maintenance cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'weekly_maintenance',
      schedule: '0 4 * * 0',
      job,
    });
  }

  // ENHANCED: Manual device token cleanup trigger
  async triggerDeviceTokenCleanup(userId = null) {
    try {
      console.log('🧹 Manually triggering device token cleanup...');

      if (userId) {
        // Clean tokens for specific user
        const result = await deviceTokenModel.cleanupDuplicateTokens(userId);
        console.log(
          `✅ Cleaned ${result.cleaned_count} duplicate tokens for user ${userId}`,
        );
        return result;
      } else {
        // Clean tokens for all users
        const { createClient } = require('@supabase/supabase-js');
        const { supabaseUrl, supabaseKey } = require('../config/supabase');
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: users, error } = await supabase
          .from('user_notification_tokens')
          .select('user_id')
          .eq('is_active', true)
          .group('user_id');

        if (error) throw error;

        let totalCleaned = 0;
        for (const user of users || []) {
          const result = await deviceTokenModel.cleanupDuplicateTokens(
            user.user_id,
          );
          totalCleaned += result.cleaned_count;
        }

        console.log(
          `✅ Cleaned ${totalCleaned} duplicate tokens across all users`,
        );
        return { cleaned_count: totalCleaned };
      }
    } catch (error) {
      console.error('Error in manual device token cleanup:', error);
      throw error;
    }
  }

  // ENHANCED: Get comprehensive system status
  async getSystemStatus() {
    try {
      console.log('📊 Getting comprehensive system status...');

      // Token statistics
      const tokenStats = await deviceTokenModel.getPlatformStats();

      // Job status
      const jobStatus = this.getJobStatus();

      // Performance metrics
      const performanceMetrics = this.getPerformanceMetrics();

      // Recent activity (last 24 hours)
      const { createClient } = require('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = require('../config/supabase');
      const supabase = createClient(supabaseUrl, supabaseKey);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentNotifications, error: notifError } = await supabase
        .from('notifications')
        .select('status')
        .gte('created_at', yesterday.toISOString());

      if (notifError) throw notifError;

      const recentStats = {
        total: recentNotifications.length,
        sent: recentNotifications.filter((n) => n.status === 'sent').length,
        pending: recentNotifications.filter((n) => n.status === 'pending')
          .length,
        failed: recentNotifications.filter((n) => n.status === 'failed').length,
      };

      return {
        timestamp: new Date().toISOString(),
        token_stats: tokenStats,
        job_status: jobStatus,
        performance_metrics: performanceMetrics,
        recent_activity: recentStats,
        health_score: this.calculateHealthScore(
          tokenStats,
          recentStats,
          jobStatus,
        ),
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      throw error;
    }
  }

  // ENHANCED: Calculate system health score
  calculateHealthScore(tokenStats, recentStats, jobStatus) {
    let score = 100;

    // Penalize for failed notifications
    if (recentStats.total > 0) {
      const failureRate = recentStats.failed / recentStats.total;
      score -= Math.min(50, failureRate * 100);
    }

    // Penalize for stopped jobs
    const stoppedJobs = jobStatus.filter((job) => !job.running).length;
    const jobPenalty = (stoppedJobs / jobStatus.length) * 30;
    score -= jobPenalty;

    // Bonus for active tokens
    if (tokenStats.total_active > 0) {
      score += Math.min(10, tokenStats.total_active / 100);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Schedule custom notification job
  scheduleCustomJob(name, cronExpression, callback) {
    const job = cron.schedule(cronExpression, callback, {
      scheduled: true,
      timezone: 'Europe/Istanbul',
    });

    this.jobs.push({
      name,
      schedule: cronExpression,
      job,
    });

    console.log(
      `Custom notification job '${name}' scheduled with expression: ${cronExpression}`,
    );
  }

  // Start all jobs
  startAll() {
    console.log('Starting all notification cron jobs...');
    this.jobs.forEach((jobInfo) => {
      jobInfo.job.start();
      console.log(`Started job: ${jobInfo.name} (${jobInfo.schedule})`);
    });
  }

  // Stop all jobs
  stopAll() {
    console.log('Stopping all notification cron jobs...');
    this.jobs.forEach((jobInfo) => {
      jobInfo.job.stop();
      console.log(`Stopped job: ${jobInfo.name}`);
    });
  }

  // Get job status
  getJobStatus() {
    return this.jobs.map((jobInfo) => ({
      name: jobInfo.name,
      schedule: jobInfo.schedule,
      running: jobInfo.job.running || false,
      lastDate: jobInfo.job.lastDate || null,
      nextDate: jobInfo.job.nextDate || null,
    }));
  }

  // Stop specific job
  stopJob(name) {
    const jobInfo = this.jobs.find((j) => j.name === name);
    if (jobInfo) {
      jobInfo.job.stop();
      console.log(`Stopped job: ${name}`);
      return true;
    }
    return false;
  }

  // Start specific job
  startJob(name) {
    const jobInfo = this.jobs.find((j) => j.name === name);
    if (jobInfo) {
      jobInfo.job.start();
      console.log(`Started job: ${name}`);
      return true;
    }
    return false;
  }

  // Remove specific job
  removeJob(name) {
    const jobIndex = this.jobs.findIndex((j) => j.name === name);
    if (jobIndex !== -1) {
      this.jobs[jobIndex].job.destroy();
      this.jobs.splice(jobIndex, 1);
      console.log(`Removed job: ${name}`);
      return true;
    }
    return false;
  }

  // Run job immediately (for testing)
  runJobNow(name) {
    const jobInfo = this.jobs.find((j) => j.name === name);
    if (jobInfo) {
      console.log(`Running job immediately: ${name}`);

      // Get the task function from the cron job
      const task = jobInfo.job.getTask();
      if (task) {
        task.call(jobInfo.job);
        return true;
      }
    }
    return false;
  }

  // Manual achievement check trigger
  async triggerAchievementCheck(userIds = null) {
    try {
      console.log('Manually triggering achievement check...');

      const achievementService = require('./achievementService');

      if (userIds && Array.isArray(userIds)) {
        // Check specific users
        const results = await achievementService.checkMultipleUsersAchievements(
          userIds,
        );
        console.log(
          `Manual achievement check completed for ${userIds.length} users`,
        );
        return results;
      } else {
        // Check all users
        const results = await achievementService.checkAllUsersAchievements();
        console.log(
          `Manual achievement check completed for all users:`,
          results.summary,
        );
        return results;
      }
    } catch (error) {
      console.error('Error in manual achievement check:', error);
      throw error;
    }
  }

  // Schedule one-time notification
  scheduleOneTimeNotification(
    userId,
    notificationType,
    templateName,
    variables,
    scheduleTime,
  ) {
    const job = cron.schedule(
      scheduleTime,
      async () => {
        console.log(`Sending one-time notification to user ${userId}`);
        try {
          await NotificationHelpers.sendNotification(
            userId,
            notificationType,
            templateName,
            variables,
          );
          console.log(`One-time notification sent to user ${userId}`);
        } catch (error) {
          console.error(
            `Error sending one-time notification to user ${userId}:`,
            error,
          );
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    const jobName = `one_time_${userId}_${Date.now()}`;
    this.jobs.push({
      name: jobName,
      schedule: scheduleTime,
      job,
      oneTime: true,
    });

    console.log(
      `One-time notification scheduled for user ${userId} at ${scheduleTime}`,
    );
    return jobName;
  }

  // Schedule bulk notifications
  scheduleBulkNotifications(notifications, scheduleTime) {
    const job = cron.schedule(
      scheduleTime,
      async () => {
        console.log(
          `Sending bulk notifications: ${notifications.length} notifications`,
        );
        try {
          const result = await NotificationHelpers.sendBulkNotifications(
            notifications,
          );
          console.log(
            `Bulk notifications sent: ${result.successful} successful, ${result.failed} failed`,
          );
        } catch (error) {
          console.error('Error sending bulk notifications:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    const jobName = `bulk_${Date.now()}`;
    this.jobs.push({
      name: jobName,
      schedule: scheduleTime,
      job,
      bulk: true,
    });

    console.log(`Bulk notifications scheduled for ${scheduleTime}`);
    return jobName;
  }

  // Get next execution times for all jobs
  getNextExecutionTimes() {
    return this.jobs.map((jobInfo) => ({
      name: jobInfo.name,
      schedule: jobInfo.schedule,
      nextExecution: jobInfo.job.nextDate
        ? jobInfo.job.nextDate.toISOString()
        : null,
    }));
  }

  // Manual trigger for emergency notifications
  async sendEmergencyNotification(title, message, targetUsers = 'all') {
    console.log('Sending emergency notification...');
    try {
      if (targetUsers === 'all') {
        return await NotificationHelpers.sendSystemAnnouncementToAll(
          title,
          message,
        );
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
        return await NotificationHelpers.sendBulkNotifications(notifications);
      }
    } catch (error) {
      console.error('Error sending emergency notification:', error);
      throw error;
    }
  }

  // ENHANCED: Get performance metrics
  getPerformanceMetrics() {
    return {
      total_jobs: this.jobs.length,
      active_jobs: this.jobs.filter((j) => j.job.running).length,
      one_time_jobs: this.jobs.filter((j) => j.oneTime).length,
      bulk_jobs: this.jobs.filter((j) => j.bulk).length,
      recurring_jobs: this.jobs.filter((j) => !j.oneTime && !j.bulk).length,
      achievement_jobs: this.jobs.filter((j) => j.name.includes('achievement'))
        .length,
      maintenance_jobs: this.jobs.filter(
        (j) => j.name.includes('cleanup') || j.name.includes('maintenance'),
      ).length,
    };
  }
}

module.exports = new NotificationCronJobs();
