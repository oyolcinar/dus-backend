const cron = require('node-cron');
const NotificationHelpers = require('./notificationHelpers');

class NotificationCronJobs {
  constructor() {
    this.jobs = [];
  }

  // Initialize all cron jobs
  init() {
    console.log('Initializing notification cron jobs...');

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

    // NEW: Achievement checking - Every 6 hours
    this.scheduleAchievementChecking();

    // Process pending notifications - Every 5 minutes
    this.schedulePendingNotificationProcessor();

    // Cleanup old notifications - Every Sunday at 2 AM
    this.scheduleNotificationCleanup();

    console.log(`${this.jobs.length} notification cron jobs initialized`);
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

  // NEW: Schedule achievement checking
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

  // NEW: Schedule intensive achievement check (weekly)
  scheduleWeeklyAchievementCheck() {
    const job = cron.schedule(
      '0 3 * * 0', // Every Sunday at 3 AM
      async () => {
        console.log('Running intensive weekly achievement check...');
        try {
          // Check all users with higher limit for comprehensive check
          const achievementService = require('./achievementService');
          const result = await achievementService.checkAllUsersAchievements(
            500,
          );
          console.log(
            `Weekly achievement check completed: ${result.summary.totalNewAchievements} new achievements awarded`,
          );
        } catch (error) {
          console.error('Error in weekly achievement check cron job:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Istanbul',
      },
    );

    this.jobs.push({
      name: 'weekly_achievement_check',
      schedule: '0 3 * * 0',
      job,
    });
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

  // NEW: Manual achievement check trigger
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

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      total_jobs: this.jobs.length,
      active_jobs: this.jobs.filter((j) => j.job.running).length,
      one_time_jobs: this.jobs.filter((j) => j.oneTime).length,
      bulk_jobs: this.jobs.filter((j) => j.bulk).length,
      recurring_jobs: this.jobs.filter((j) => !j.oneTime && !j.bulk).length,
      achievement_jobs: this.jobs.filter((j) => j.name.includes('achievement'))
        .length,
    };
  }
}

module.exports = new NotificationCronJobs();
