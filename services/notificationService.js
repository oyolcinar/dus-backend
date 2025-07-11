const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const notificationModel = require('../models/notificationModel');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize services
const supabase = createClient(supabaseUrl, supabaseKey);

class NotificationService {
  constructor() {
    this.initializeFirebase();
    this.initializeSendGrid();
  }

  initializeFirebase() {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      }
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  initializeSendGrid() {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('SendGrid initialized successfully');
    } catch (error) {
      console.error('SendGrid initialization error:', error);
    }
  }

  // Send notification to user
  async sendNotification(
    userId,
    notificationType,
    templateName,
    variables = {},
  ) {
    try {
      console.log(`Sending notification to user ${userId}: ${templateName}`);

      // Create notification in database
      const notification = await notificationModel.createFromTemplate(
        templateName,
        userId,
        variables,
      );

      // Get user preferences
      const preferences = await this.getUserPreferences(
        userId,
        notificationType,
      );

      // Check if user wants this type of notification
      if (!preferences) {
        console.log(
          `User ${userId} has disabled ${notificationType} notifications`,
        );
        return notification;
      }

      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        console.log(
          `Notification delayed due to quiet hours for user ${userId}`,
        );
        return notification;
      }

      // Send push notification
      if (preferences.push_enabled) {
        await this.sendPushNotification(userId, notification);
      }

      // Send email notification
      if (preferences.email_enabled) {
        await this.sendEmailNotification(userId, notification);
      }

      // Update notification status
      await notificationModel.updateStatus(
        notification.notification_id,
        'sent',
      );

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send push notification
  async sendPushNotification(userId, notification) {
    try {
      // Get user's device tokens
      const { data: tokens, error } = await supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      if (!tokens || tokens.length === 0) {
        console.log(`No device tokens found for user ${userId}`);
        return;
      }

      const pushPromises = tokens.map((token) => {
        switch (token.platform) {
          case 'android':
          case 'ios':
          case 'web':
            return this.sendFirebasePush(
              token.device_token,
              notification,
              token.platform,
            );
          default:
            console.warn(`Unknown platform: ${token.platform}`);
            return Promise.resolve();
        }
      });

      await Promise.allSettled(pushPromises);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send push notification via Firebase (handles all platforms)
  async sendFirebasePush(deviceToken, notification, platform) {
    try {
      const baseMessage = {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          notification_id: notification.notification_id.toString(),
          notification_type: notification.notification_type,
          action_url: notification.action_url || '',
          metadata: JSON.stringify(notification.metadata || {}),
        },
      };

      // Platform-specific configurations
      switch (platform) {
        case 'android':
          baseMessage.android = {
            priority: 'high',
            ttl: 24 * 60 * 60 * 1000, // 24 hours
            notification: {
              icon: notification.icon_name,
              color: '#1976d2',
              sound: 'default',
            },
          };
          break;

        case 'ios':
          baseMessage.apns = {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
                alert: {
                  title: notification.title,
                  body: notification.body,
                },
              },
            },
            headers: {
              'apns-priority': '10',
              'apns-expiration': Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
            },
          };
          break;

        case 'web':
          baseMessage.webpush = {
            headers: {
              TTL: '86400', // 24 hours
            },
            notification: {
              title: notification.title,
              body: notification.body,
              icon: `/icons/${notification.icon_name}.png`,
              badge: '/icons/badge.png',
              requireInteraction: true,
            },
            fcmOptions: {
              link: notification.action_url || '/',
            },
          };
          break;
      }

      const response = await admin.messaging().send(baseMessage);
      console.log(`${platform} push sent successfully:`, response);
      return response;
    } catch (error) {
      console.error(`Error sending ${platform} push:`, error);
      // Handle invalid token
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.disableToken(deviceToken);
      }
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(userId, notification) {
    try {
      // Get user email
      const { data: user, error } = await supabase
        .from('users')
        .select('email, username')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const msg = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: notification.title,
        html: this.generateEmailTemplate(notification, user),
      };

      await sgMail.send(msg);
      console.log('Email notification sent successfully');
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  }

  // Generate email template
  generateEmailTemplate(notification, user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .title { color: #333; margin-bottom: 10px; }
          .body { color: #666; line-height: 1.6; margin-bottom: 30px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">${notification.title}</h1>
          </div>
          <div class="body">
            <p>Merhaba ${user.username},</p>
            <p>${notification.body}</p>
            ${
              notification.action_url
                ? `<a href="${process.env.FRONTEND_URL}${notification.action_url}" class="button">Şimdi Gör</a>`
                : ''
            }
          </div>
          <div class="footer">
            <p>DUS App - Bildirim ayarlarınızı uygulamadan değiştirebilirsiniz</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Get user notification preferences
  async getUserPreferences(userId, notificationType) {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('notification_type', notificationType)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found error
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  // Check if current time is within quiet hours
  isQuietHours(preferences) {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const startTime = this.timeToMinutes(preferences.quiet_hours_start);
    const endTime = this.timeToMinutes(preferences.quiet_hours_end);

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  // Convert time string to minutes
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Disable invalid token
  async disableToken(deviceToken) {
    try {
      const { error } = await supabase
        .from('user_notification_tokens')
        .update({ is_active: false })
        .eq('device_token', deviceToken);

      if (error) throw error;
      console.log('Token disabled:', deviceToken);
    } catch (error) {
      console.error('Error disabling token:', error);
    }
  }

  // Register device token
  async registerDeviceToken(userId, deviceToken, platform) {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .upsert(
          {
            user_id: userId,
            device_token: deviceToken,
            platform: platform,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'device_token',
            ignoreDuplicates: false,
          },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  // Update user notification preferences
  async updateUserPreferences(userId, notificationType, preferences) {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: userId,
            notification_type: notificationType,
            ...preferences,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,notification_type',
            ignoreDuplicates: false,
          },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Initialize default preferences for new user
  async initializeDefaultPreferences(userId) {
    try {
      const notificationTypes = [
        'study_reminder',
        'achievement_unlock',
        'duel_invitation',
        'duel_result',
        'friend_request',
        'friend_activity',
        'content_update',
        'streak_reminder',
        'plan_reminder',
        'coaching_note',
        'motivational_message',
        'system_announcement',
      ];

      const defaultPreferences = notificationTypes.map((type) => ({
        user_id: userId,
        notification_type: type,
        in_app_enabled: true,
        push_enabled: true,
        email_enabled: false,
        frequency_hours: 24,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert(defaultPreferences)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error initializing default preferences:', error);
      throw error;
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(notifications) {
    try {
      const promises = notifications.map((notif) =>
        this.sendNotification(
          notif.userId,
          notif.notificationType,
          notif.templateName,
          notif.variables,
        ),
      );

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(
        `Bulk notifications sent: ${successful} successful, ${failed} failed`,
      );
      return { successful, failed, results };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Process pending notifications (for cron jobs)
  async processPendingNotifications() {
    try {
      const pendingNotifications =
        await notificationModel.getPendingNotifications();

      if (pendingNotifications.length === 0) {
        console.log('No pending notifications to process');
        return;
      }

      console.log(
        `Processing ${pendingNotifications.length} pending notifications`,
      );

      for (const notification of pendingNotifications) {
        try {
          await this.sendPushNotification(notification.user_id, notification);
          await notificationModel.updateStatus(
            notification.notification_id,
            'sent',
          );
        } catch (error) {
          console.error(
            `Error processing notification ${notification.notification_id}:`,
            error,
          );
          await notificationModel.updateStatus(
            notification.notification_id,
            'failed',
          );
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
