const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Coaching Notes Model
const coachingNoteModel = {
  // Create a new coaching note
  async create(title, content, publishDate, weekNumber, year) {
    try {
      const { data, error } = await supabase
        .from('coaching_notes')
        .insert({
          title,
          content,
          publish_date: publishDate,
          week_number: weekNumber,
          year,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating coaching note:', error);
      throw error;
    }
  },

  // Get all coaching notes
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('coaching_notes')
        .select('*')
        .order('publish_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error retrieving coaching notes:', error);
      throw error;
    }
  },

  // Get latest coaching note
  async getLatest() {
    try {
      const { data, error } = await supabase
        .from('coaching_notes')
        .select('*')
        .order('publish_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows returned

      return data || null;
    } catch (error) {
      console.error('Error retrieving latest coaching note:', error);
      throw error;
    }
  },

  // Get note by ID
  async getById(noteId) {
    try {
      const { data, error } = await supabase
        .from('coaching_notes')
        .select('*')
        .eq('note_id', noteId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || null;
    } catch (error) {
      console.error(`Error retrieving coaching note ID ${noteId}:`, error);
      throw error;
    }
  },

  // Update note
  async update(noteId, updates) {
    try {
      const { data, error } = await supabase
        .from('coaching_notes')
        .update(updates)
        .eq('note_id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating coaching note ID ${noteId}:`, error);
      throw error;
    }
  },

  // Delete note
  async delete(noteId) {
    try {
      const { data, error } = await supabase
        .from('coaching_notes')
        .delete()
        .eq('note_id', noteId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || { note_id: noteId };
    } catch (error) {
      console.error(`Error deleting coaching note ID ${noteId}:`, error);
      throw error;
    }
  },
};

// Motivational Messages Model
const motivationalMessageModel = {
  // Create a new motivational message
  async create(title, audioUrl, description, publishDate) {
    try {
      const { data, error } = await supabase
        .from('motivational_messages')
        .insert({
          title,
          audio_url: audioUrl,
          description,
          publish_date: publishDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating motivational message:', error);
      throw error;
    }
  },

  // Get all motivational messages
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('motivational_messages')
        .select('*')
        .order('publish_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error retrieving motivational messages:', error);
      throw error;
    }
  },

  // Get message by ID
  async getById(messageId) {
    try {
      const { data, error } = await supabase
        .from('motivational_messages')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || null;
    } catch (error) {
      console.error(
        `Error retrieving motivational message ID ${messageId}:`,
        error,
      );
      throw error;
    }
  },

  // Update message
  async update(messageId, updates) {
    try {
      const { data, error } = await supabase
        .from('motivational_messages')
        .update(updates)
        .eq('message_id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error updating motivational message ID ${messageId}:`,
        error,
      );
      throw error;
    }
  },

  // Delete message
  async delete(messageId) {
    try {
      const { data, error } = await supabase
        .from('motivational_messages')
        .delete()
        .eq('message_id', messageId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || { message_id: messageId };
    } catch (error) {
      console.error(
        `Error deleting motivational message ID ${messageId}:`,
        error,
      );
      throw error;
    }
  },
};

// Strategy Videos Model
const strategyVideoModel = {
  // Create a new strategy video
  async create(title, externalUrl, description, isPremium) {
    try {
      const { data, error } = await supabase
        .from('strategy_videos')
        .insert({
          title,
          external_url: externalUrl,
          description,
          is_premium: isPremium,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating strategy video:', error);
      throw error;
    }
  },

  // Get all strategy videos
  async getAll(isPremium = null) {
    try {
      let query = supabase
        .from('strategy_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (isPremium !== null) {
        query = query.eq('is_premium', isPremium);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error retrieving strategy videos:', error);
      throw error;
    }
  },

  // Get video by ID
  async getById(videoId) {
    try {
      const { data, error } = await supabase
        .from('strategy_videos')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || null;
    } catch (error) {
      console.error(`Error retrieving strategy video ID ${videoId}:`, error);
      throw error;
    }
  },

  // Update video
  async update(videoId, updates) {
    try {
      const { data, error } = await supabase
        .from('strategy_videos')
        .update(updates)
        .eq('video_id', videoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating strategy video ID ${videoId}:`, error);
      throw error;
    }
  },

  // Delete video
  async delete(videoId) {
    try {
      const { data, error } = await supabase
        .from('strategy_videos')
        .delete()
        .eq('video_id', videoId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || { video_id: videoId };
    } catch (error) {
      console.error(`Error deleting strategy video ID ${videoId}:`, error);
      throw error;
    }
  },
};

module.exports = {
  coachingNoteModel,
  motivationalMessageModel,
  strategyVideoModel,
};
