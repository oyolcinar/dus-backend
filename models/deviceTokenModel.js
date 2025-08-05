const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const deviceTokenModel = {
  // Create or update device token with enhanced info
  async upsertToken(userId, deviceToken, platform, deviceInfo = {}) {
    try {
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
      return data;
    } catch (error) {
      console.error('Error upserting device token:', error);
      throw error;
    }
  },

  // Get all tokens for a user
  async getByUserId(userId, activeOnly = false) {
    try {
      let query = supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting tokens by user ID:', error);
      throw error;
    }
  },

  // Get token by device token string
  async getByToken(deviceToken) {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('device_token', deviceToken)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found error
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error getting token by device token:', error);
      throw error;
    }
  },

  // Disable token (mark as inactive)
  async disableToken(deviceToken, reason = 'manual') {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .update({
          is_active: false,
          disabled_at: new Date().toISOString(),
          disabled_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('device_token', deviceToken)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error disabling token:', error);
      throw error;
    }
  },

  // Clear all tokens for a user
  async clearUserTokens(userId) {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .update({
          is_active: false,
          disabled_at: new Date().toISOString(),
          disabled_reason: 'user_cleared',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_active', true)
        .select('token_id');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error clearing user tokens:', error);
      throw error;
    }
  },

  // Delete old inactive tokens (cleanup)
  async deleteOldTokens(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('user_notification_tokens')
        .delete()
        .eq('is_active', false)
        .lt('disabled_at', cutoffDate.toISOString())
        .select('token_id');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting old tokens:', error);
      throw error;
    }
  },

  // Get tokens by platform
  async getByPlatform(platform, activeOnly = true) {
    try {
      let query = supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('platform', platform)
        .order('updated_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting tokens by platform:', error);
      throw error;
    }
  },

  // Check if user has active tokens
  async hasActiveTokens(userId) {
    try {
      const { count, error } = await supabase
        .from('user_notification_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      return count > 0;
    } catch (error) {
      console.error('Error checking active tokens:', error);
      throw error;
    }
  },

  // Get platform distribution statistics
  async getPlatformStats() {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .select('platform, is_active')
        .eq('is_active', true);

      if (error) throw error;

      const stats = {
        total_active: data.length,
        by_platform: {},
      };

      data.forEach((token) => {
        if (!stats.by_platform[token.platform]) {
          stats.by_platform[token.platform] = 0;
        }
        stats.by_platform[token.platform]++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting platform stats:', error);
      throw error;
    }
  },

  // Update token last used timestamp
  async updateLastUsed(deviceToken) {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .update({
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('device_token', deviceToken)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating last used:', error);
      throw error;
    }
  },

  // Find potentially duplicate tokens (same user, different devices)
  async findDuplicateTokens(userId) {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by platform and device info
      const groups = {};
      data.forEach((token) => {
        const key = `${token.platform}-${token.device_model}-${token.device_id}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(token);
      });

      // Find groups with multiple tokens
      const duplicates = Object.values(groups).filter(
        (group) => group.length > 1,
      );
      return duplicates;
    } catch (error) {
      console.error('Error finding duplicate tokens:', error);
      throw error;
    }
  },

  // Clean up duplicate tokens (keep the most recent)
  async cleanupDuplicateTokens(userId) {
    try {
      const duplicateGroups = await this.findDuplicateTokens(userId);
      let cleanedCount = 0;

      for (const group of duplicateGroups) {
        // Keep the most recent token, disable the rest
        const [keepToken, ...disableTokens] = group;

        for (const token of disableTokens) {
          await this.disableToken(token.device_token, 'duplicate_cleanup');
          cleanedCount++;
        }
      }

      return { cleaned_count: cleanedCount };
    } catch (error) {
      console.error('Error cleaning duplicate tokens:', error);
      throw error;
    }
  },

  // Get tokens that haven't been used in X days
  async getStaleTokens(daysStale = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysStale);

      const { data, error } = await supabase
        .from('user_notification_tokens')
        .select('*')
        .eq('is_active', true)
        .or(`last_used_at.lt.${cutoffDate.toISOString()},last_used_at.is.null`)
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting stale tokens:', error);
      throw error;
    }
  },

  // Bulk disable tokens
  async bulkDisableTokens(tokenIds, reason = 'bulk_operation') {
    try {
      const { data, error } = await supabase
        .from('user_notification_tokens')
        .update({
          is_active: false,
          disabled_at: new Date().toISOString(),
          disabled_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .in('token_id', tokenIds)
        .select('token_id');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error bulk disabling tokens:', error);
      throw error;
    }
  },

  // Get comprehensive debug info for a user
  async getDebugInfo(userId) {
    try {
      const tokens = await this.getByUserId(userId);
      const activeTokens = tokens.filter((t) => t.is_active);
      const inactiveTokens = tokens.filter((t) => !t.is_active);

      const platformCounts = {};
      activeTokens.forEach((token) => {
        platformCounts[token.platform] =
          (platformCounts[token.platform] || 0) + 1;
      });

      const duplicates = await this.findDuplicateTokens(userId);

      return {
        user_id: userId,
        total_tokens: tokens.length,
        active_tokens: activeTokens.length,
        inactive_tokens: inactiveTokens.length,
        platforms: Object.keys(platformCounts),
        platform_counts: platformCounts,
        duplicate_groups: duplicates.length,
        tokens: tokens.map((token) => ({
          token_id: token.token_id,
          platform: token.platform,
          device_model: token.device_model,
          device_os_version: token.device_os_version,
          app_version: token.app_version,
          is_active: token.is_active,
          created_at: token.created_at,
          updated_at: token.updated_at,
          last_used_at: token.last_used_at,
          disabled_at: token.disabled_at,
          disabled_reason: token.disabled_reason,
          token_preview: token.device_token?.substring(0, 20) + '...',
        })),
      };
    } catch (error) {
      console.error('Error getting debug info:', error);
      throw error;
    }
  },

  // Test token validity (attempt to send a test notification)
  async testToken(deviceToken) {
    try {
      // This would integrate with your notification service
      // For now, just return the token info
      const token = await this.getByToken(deviceToken);
      if (!token) {
        throw new Error('Token not found');
      }

      if (!token.is_active) {
        throw new Error('Token is inactive');
      }

      // Update last used
      await this.updateLastUsed(deviceToken);

      return {
        valid: true,
        token: token,
        message: 'Token is valid and active',
      };
    } catch (error) {
      console.error('Error testing token:', error);
      return {
        valid: false,
        error: error.message,
      };
    }
  },
};

module.exports = deviceTokenModel;
