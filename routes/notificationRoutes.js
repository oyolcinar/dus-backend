const express = require('express');
const router = express.Router();
const notificationModel = require('../models/notificationModel');
const notificationService = require('../services/notificationService');
const authSupabase = require('../middleware/authSupabase');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         notification_id:
 *           type: integer
 *           description: Unique identifier for the notification
 *         user_id:
 *           type: integer
 *           description: ID of the user who will receive the notification
 *         notification_type:
 *           type: string
 *           enum: [study_reminder, achievement_unlock, duel_invitation, duel_result, friend_request, friend_activity, content_update, streak_reminder, plan_reminder, coaching_note, motivational_message, system_announcement]
 *           description: Type of notification
 *         title:
 *           type: string
 *           description: Notification title
 *         body:
 *           type: string
 *           description: Notification body text
 *         action_url:
 *           type: string
 *           description: URL to navigate when notification is clicked
 *         icon_name:
 *           type: string
 *           description: Icon name for the notification
 *         status:
 *           type: string
 *           enum: [pending, sent, delivered, read, failed]
 *           description: Current status of the notification
 *         is_read:
 *           type: boolean
 *           description: Whether the notification has been read
 *         metadata:
 *           type: object
 *           description: Additional metadata for the notification
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the notification was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: When the notification was last updated
 *         sent_at:
 *           type: string
 *           format: date-time
 *           description: When the notification was sent
 *         read_at:
 *           type: string
 *           format: date-time
 *           description: When the notification was read
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of notifications to skip
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Only return unread notifications
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 unread_count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authSupabase, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unread_only = false } = req.query;
    const userId = req.user.userId;

    const notifications = await notificationModel.getByUserId(
      userId,
      parseInt(limit),
      parseInt(offset),
      unread_only === 'true',
    );

    const unreadCount = await notificationModel.getUnreadCount(userId);

    res.json({
      notifications,
      unread_count: unreadCount,
      total_count: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unread_count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/unread-count', authSupabase, async (req, res) => {
  try {
    const userId = req.user.userId;
    const unreadCount = await notificationModel.getUnreadCount(userId);

    res.json({ unread_count: unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/read', authSupabase, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.userId;

    const notification = await notificationModel.markAsRead(
      notificationId,
      userId,
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   post:
 *     summary: Mark all notifications as read for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 marked_count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/mark-all-read', authSupabase, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await notificationModel.markAllAsRead(userId);

    res.json({
      message: 'All notifications marked as read',
      marked_count: result.length,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authSupabase, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.userId;

    const notification = await notificationModel.delete(notificationId, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get user notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   notification_type:
 *                     type: string
 *                   in_app_enabled:
 *                     type: boolean
 *                   push_enabled:
 *                     type: boolean
 *                   email_enabled:
 *                     type: boolean
 *                   frequency_hours:
 *                     type: integer
 *                   quiet_hours_start:
 *                     type: string
 *                   quiet_hours_end:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/preferences', authSupabase, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { createClient } = require('@supabase/supabase-js');
    const { supabaseUrl, supabaseKey } = require('../config/supabase');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('notification_type');

    if (error) throw error;

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update user notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notification_type:
 *                 type: string
 *                 enum: [study_reminder, achievement_unlock, duel_invitation, duel_result, friend_request, friend_activity, content_update, streak_reminder, plan_reminder, coaching_note, motivational_message, system_announcement]
 *               in_app_enabled:
 *                 type: boolean
 *               push_enabled:
 *                 type: boolean
 *               email_enabled:
 *                 type: boolean
 *               frequency_hours:
 *                 type: integer
 *               quiet_hours_start:
 *                 type: string
 *               quiet_hours_end:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/preferences', authSupabase, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notification_type, ...preferences } = req.body;

    if (!notification_type) {
      return res.status(400).json({ error: 'notification_type is required' });
    }

    const updatedPreferences = await notificationService.updateUserPreferences(
      userId,
      notification_type,
      preferences,
    );

    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/device-token:
 *   post:
 *     summary: Register device token for push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_token:
 *                 type: string
 *                 description: Device token from Firebase/Apple
 *               platform:
 *                 type: string
 *                 enum: [ios, android, web]
 *                 description: Platform type
 *             required:
 *               - device_token
 *               - platform
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/device-token', authSupabase, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { device_token, platform } = req.body;

    if (!device_token || !platform) {
      return res
        .status(400)
        .json({ error: 'device_token and platform are required' });
    }

    const validPlatforms = ['ios', 'android', 'web'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const result = await notificationService.registerDeviceToken(
      userId,
      device_token,
      platform,
    );

    res.json({
      message: 'Device token registered successfully',
      token: result,
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification (for testing purposes)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               template_name:
 *                 type: string
 *                 description: Template name to use
 *               notification_type:
 *                 type: string
 *                 enum: [study_reminder, achievement_unlock, duel_invitation, duel_result, friend_request, friend_activity, content_update, streak_reminder, plan_reminder, coaching_note, motivational_message, system_announcement]
 *               variables:
 *                 type: object
 *                 description: Variables to replace in template
 *             required:
 *               - template_name
 *               - notification_type
 *     responses:
 *       200:
 *         description: Test notification sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/test', authSupabase, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { template_name, notification_type, variables = {} } = req.body;

    if (!template_name || !notification_type) {
      return res
        .status(400)
        .json({ error: 'template_name and notification_type are required' });
    }

    const notification = await notificationService.sendNotification(
      userId,
      notification_type,
      template_name,
      variables,
    );

    res.json({
      message: 'Test notification sent successfully',
      notification,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     summary: Get notification statistics for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Notification statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_notifications:
 *                   type: integer
 *                 read_count:
 *                   type: integer
 *                 unread_count:
 *                   type: integer
 *                 type_counts:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authSupabase, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    const stats = await notificationModel.getStats(userId, parseInt(days));

    res.json(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
