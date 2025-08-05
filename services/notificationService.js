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

  // ENHANCED: Fixed Firebase initialization with proper error handling
  initializeFirebase() {
    try {
      if (!admin.apps.length) {
        // Method 1: Try service account JSON file first (recommended)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
          admin.initializeApp({
            credential: admin.credential.cert(
              require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
            ),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
          console.log('✅ Firebase initialized with service account file');
        }
        // Method 2: Try JSON string from environment
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
          const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
          );
          // Fix private key formatting
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(
              /\\n/g,
              '\n',
            );
          }
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
          });
          console.log('✅ Firebase initialized with JSON string');
        }
        // Method 3: Fallback to individual environment variables
        else {
          const serviceAccount = {
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(
              /\\n/g,
              '\n',
            ), // FIXED: Proper newline handling
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url:
              'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
            universe_domain: 'googleapis.com',
          };

          // Validate private key format
          if (
            !serviceAccount.private_key ||
            !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')
          ) {
            throw new Error(
              'Invalid Firebase private key format. Ensure it includes proper BEGIN/END markers and newlines.',
            );
          }

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
          console.log('✅ Firebase initialized with environment variables');
        }
      }
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      console.error(
        '🔧 Check your Firebase service account credentials and private key formatting',
      );
      throw error;
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

  // ENHANCED: Register device token with device info and cleanup
  async registerDeviceTokenEnhanced(
    userId,
    deviceToken,
    platform,
    deviceInfo = {},
  ) {
    try {
      console.log('📝 Enhanced device token registration:', {
        userId,
        platform,
        token: deviceToken.substring(0, 20) + '...',
        deviceInfo,
      });

      // Check if this is a different device/platform than last registration
      const { data: lastTokens, error: fetchError } = await supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      // If there's a previous token and platform/device changed, deactivate old tokens
      if (lastTokens && lastTokens.length > 0) {
        const lastToken = lastTokens[0];
        const deviceChanged =
          lastToken.platform !== platform ||
          (deviceInfo.model && lastToken.device_model !== deviceInfo.model) ||
          (deviceInfo.device_id &&
            lastToken.device_id !== deviceInfo.device_id);

        if (deviceChanged) {
          console.log('🔄 Device/platform changed, deactivating old tokens');
          await this.clearUserDeviceTokens(userId);
        }
      }

      // Register new token with enhanced device info
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .upsert(
          {
            user_id: userId,
            device_token: deviceToken,
            platform: platform,
            device_model: deviceInfo.model || null,
            device_os_version: deviceInfo.os_version || null,
            app_version: deviceInfo.app_version || null,
            device_id: deviceInfo.device_id || null,
            is_device:
              deviceInfo.is_device !== undefined ? deviceInfo.is_device : true,
            is_active: true,
            created_at: new Date().toISOString(),
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

      console.log('✅ Enhanced device token registered successfully');
      return data;
    } catch (error) {
      console.error('❌ Error in enhanced device token registration:', error);
      throw error;
    }
  }

  // ENHANCED: Clear all device tokens for a user
  async clearUserDeviceTokens(userId) {
    try {
      console.log(`🧹 Clearing device tokens for user ${userId}`);

      const { data, error } = await supabase
        .from('user_notification_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_active', true)
        .select('token_id');

      if (error) throw error;

      console.log(`✅ Cleared ${data.length} device tokens for user ${userId}`);
      return { cleared_count: data.length };
    } catch (error) {
      console.error('❌ Error clearing device tokens:', error);
      throw error;
    }
  }

  // ENHANCED: Get device token debug information
  async getDeviceTokenDebugInfo(userId) {
    try {
      const { data: tokens, error } = await supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const debugInfo = {
        total_tokens: tokens.length,
        active_tokens: tokens.filter((t) => t.is_active).length,
        inactive_tokens: tokens.filter((t) => !t.is_active).length,
        platforms: [...new Set(tokens.map((t) => t.platform))],
        tokens: tokens.map((token) => ({
          token_id: token.token_id,
          platform: token.platform,
          device_model: token.device_model,
          device_os_version: token.device_os_version,
          app_version: token.app_version,
          is_active: token.is_active,
          created_at: token.created_at,
          updated_at: token.updated_at,
          token_preview: token.device_token?.substring(0, 20) + '...',
        })),
      };

      return debugInfo;
    } catch (error) {
      console.error('❌ Error getting device token debug info:', error);
      throw error;
    }
  }

  // ENHANCED: Send test notification with optional push
  async sendTestNotificationEnhanced(
    userId,
    notificationType,
    templateName,
    variables = {},
    sendPush = false,
  ) {
    try {
      console.log(`🧪 Sending enhanced test notification to user ${userId}`);

      // Create notification in database
      const notification = await notificationModel.createFromTemplate(
        templateName,
        userId,
        variables,
      );

      // Optionally send actual push notification
      if (sendPush) {
        console.log('📱 Sending actual push notification for test');
        await this.sendPushNotification(userId, notification);
      }

      // Update notification status
      await notificationModel.updateStatus(
        notification.notification_id,
        sendPush ? 'sent' : 'pending',
      );

      return notification;
    } catch (error) {
      console.error('❌ Error sending enhanced test notification:', error);
      throw error;
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

  // ENHANCED: Send push notification with better error handling and platform detection
  async sendPushNotification(userId, notification) {
    try {
      // Get user's active device tokens
      const { data: tokens, error } = await supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      if (!tokens || tokens.length === 0) {
        console.log(`No active device tokens found for user ${userId}`);
        return;
      }

      console.log(
        `📱 Sending push to ${tokens.length} devices for user ${userId}`,
      );

      const pushPromises = tokens.map(async (token) => {
        try {
          // Handle Expo push tokens vs FCM tokens
          if (token.device_token.startsWith('ExponentPushToken')) {
            return await this.sendExpoPushNotification(
              token.device_token,
              notification,
            );
          } else {
            return await this.sendFirebasePush(
              token.device_token,
              notification,
              token.platform,
            );
          }
        } catch (tokenError) {
          console.error(
            `Error sending push to token ${token.token_id}:`,
            tokenError,
          );

          // Handle invalid tokens
          if (
            tokenError.code === 'messaging/invalid-registration-token' ||
            tokenError.code === 'messaging/registration-token-not-registered' ||
            tokenError.message?.includes('InvalidRegistrationToken')
          ) {
            await this.disableToken(token.device_token);
          }

          throw tokenError;
        }
      });

      const results = await Promise.allSettled(pushPromises);
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(
        `📊 Push notification results: ${successful} successful, ${failed} failed`,
      );
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // ENHANCED: Send Expo push notification
  async sendExpoPushNotification(expoPushToken, notification) {
    try {
      const { Expo } = require('expo-server-sdk');
      const expo = new Expo();

      if (!Expo.isExpoPushToken(expoPushToken)) {
        throw new Error('Invalid Expo push token');
      }

      const message = {
        to: expoPushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: {
          notification_id: notification.notification_id.toString(),
          notification_type: notification.notification_type,
          action_url: notification.action_url || '',
          metadata: JSON.stringify(notification.metadata || {}),
        },
      };

      const ticketChunk = await expo.sendPushNotificationsAsync([message]);
      console.log('📨 Expo notification sent:', ticketChunk);
      return ticketChunk;
    } catch (error) {
      console.error('❌ Error sending Expo push notification:', error);
      throw error;
    }
  }

  // ENHANCED: Send push notification via Firebase with better error handling
  async sendFirebasePush(deviceToken, notification, platform) {
    try {
      console.log(`📱 Sending ${platform} push notification`);

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
      console.log(`✅ ${platform} push sent successfully:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Error sending ${platform} push:`, error);

      // Enhanced error handling for common issues
      if (error.message?.includes('secretOrPrivateKey')) {
        console.error(
          '🔧 Firebase configuration error. Check your service account private key formatting.',
        );
        throw new Error(
          'Firebase configuration error: Invalid private key format',
        );
      } else if (error.message?.includes('private_key')) {
        console.error(
          '🔧 Private key issue detected. Verify your Firebase service account credentials.',
        );
        throw new Error(
          'Firebase credential error: Private key validation failed',
        );
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

  // ENHANCED: Disable invalid token with better logging
  async disableToken(deviceToken) {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
          disabled_reason: 'invalid_token',
        })
        .eq('device_token', deviceToken)
        .select('token_id, user_id');

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(
          `🔴 Token disabled for user ${data[0].user_id}:`,
          deviceToken.substring(0, 20) + '...',
        );
      }
    } catch (error) {
      console.error('Error disabling token:', error);
    }
  }

  // LEGACY: Keep original function for backward compatibility
  async registerDeviceToken(userId, deviceToken, platform) {
    console.log(
      '⚠️ Using legacy registerDeviceToken - consider using registerDeviceTokenEnhanced',
    );
    return this.registerDeviceTokenEnhanced(userId, deviceToken, platform);
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
