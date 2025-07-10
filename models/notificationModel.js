const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const notificationModel = {
  // Create a new notification
  async create(
    userId,
    notificationType,
    title,
    body,
    actionUrl = null,
    iconName = null,
    metadata = {},
  ) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          notification_type: notificationType,
          title: title,
          body: body,
          action_url: actionUrl,
          icon_name: iconName,
          metadata: metadata,
          status: 'pending',
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Create notification from template
  async createFromTemplate(templateName, userId, variables = {}) {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('template_name', templateName)
        .eq('is_active', true)
        .single();

      if (templateError) throw templateError;

      // Replace variables in template
      const title = this.replaceVariables(template.title_template, variables);
      const body = this.replaceVariables(template.body_template, variables);
      const actionUrl = template.action_url_template
        ? this.replaceVariables(template.action_url_template, variables)
        : null;

      // Create notification
      return await this.create(
        userId,
        template.notification_type,
        title,
        body,
        actionUrl,
        template.icon_name,
        variables,
      );
    } catch (error) {
      console.error('Error creating notification from template:', error);
      throw error;
    }
  },

  // Replace variables in template strings
  replaceVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  },

  // Get notifications for a user
  async getByUserId(userId, limit = 20, offset = 0, unreadOnly = false) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('notification_id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('notification_id');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Get unread count for a user
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  },

  // Delete notification
  async delete(notificationId, userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', notificationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Get notification by ID
  async getById(notificationId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('notification_id', notificationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting notification:', error);
      throw error;
    }
  },

  // Create bulk notifications
  async createBulk(notifications) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(
          notifications.map((notif) => ({
            ...notif,
            status: 'pending',
            is_read: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        )
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  },

  // Get notifications by type
  async getByType(userId, type, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('notification_type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting notifications by type:', error);
      throw error;
    }
  },

  // Update notification status
  async updateStatus(notificationId, status) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({
          status: status,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('notification_id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification status:', error);
      throw error;
    }
  },

  // Get notification statistics
  async getStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('notifications')
        .select('notification_type, is_read, status')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const stats = {
        total_notifications: data.length,
        read_count: data.filter((n) => n.is_read).length,
        unread_count: data.filter((n) => !n.is_read).length,
        type_counts: {},
      };

      // Count by type
      data.forEach((notification) => {
        if (!stats.type_counts[notification.notification_type]) {
          stats.type_counts[notification.notification_type] = 0;
        }
        stats.type_counts[notification.notification_type]++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  },

  // Get pending notifications for sending
  async getPendingNotifications(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      throw error;
    }
  },

  // Clean up old notifications
  async cleanupOldNotifications(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('notification_id');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  },
};

module.exports = notificationModel;
