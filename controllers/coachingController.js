const {
  coachingNoteModel,
  motivationalMessageModel,
  strategyVideoModel,
} = require('../models/coachingModels');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

const coachingController = {
  // Create a new coaching note
  async createNote(req, res) {
    try {
      const { title, content, publishDate, weekNumber, year } = req.body;

      // Validate input
      if (!title || !content || !publishDate || !weekNumber || !year) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create note
      const newNote = await coachingNoteModel.create(
        title,
        content,
        publishDate,
        weekNumber,
        year,
      );

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) created coaching note: ${title}`);

      res.status(201).json({
        message: 'Coaching note created successfully',
        note: newNote,
      });
    } catch (error) {
      console.error('Coaching note creation error:', error);
      res.status(500).json({ message: 'Failed to create coaching note' });
    }
  },

  // Get all coaching notes
  async getAllNotes(req, res) {
    try {
      const notes = await coachingNoteModel.getAll();
      res.json(notes);
    } catch (error) {
      console.error('Get coaching notes error:', error);
      res.status(500).json({ message: 'Failed to retrieve coaching notes' });
    }
  },

  // Get latest coaching note
  async getLatestNote(req, res) {
    try {
      const note = await coachingNoteModel.getLatest();
      if (!note) {
        return res.status(404).json({ message: 'No coaching notes found' });
      }

      res.json(note);
    } catch (error) {
      console.error('Get latest note error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve latest coaching note' });
    }
  },

  // Update an existing coaching note
  async updateNote(req, res) {
    try {
      const noteId = parseInt(req.params.id);
      const { title, content, publishDate, weekNumber, year } = req.body;

      // Validate essential inputs
      if (!title && !content && !publishDate && !weekNumber && !year) {
        return res.status(400).json({ message: 'No update fields provided' });
      }

      // Check if note exists
      const existingNote = await coachingNoteModel.getById(noteId);
      if (!existingNote) {
        return res.status(404).json({ message: 'Coaching note not found' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Update note with provided fields
      const updatedNote = await coachingNoteModel.update(
        noteId,
        {
          title: title || existingNote.title,
          content: content || existingNote.content,
          publish_date: publishDate || existingNote.publish_date,
          week_number: weekNumber || existingNote.week_number,
          year: year || existingNote.year,
        }
      );

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) updated coaching note ID: ${noteId}`);

      res.json({
        message: 'Coaching note updated successfully',
        note: updatedNote,
      });
    } catch (error) {
      console.error('Update coaching note error:', error);
      res.status(500).json({ message: 'Failed to update coaching note' });
    }
  },

  // Create a new motivational message
  async createMessage(req, res) {
    try {
      const { title, audioUrl, description, publishDate } = req.body;

      // Validate input
      if (!title || !audioUrl || !publishDate) {
        return res
          .status(400)
          .json({ message: 'Title, audio URL, and publish date are required' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create message
      const newMessage = await motivationalMessageModel.create(
        title,
        audioUrl,
        description || null,
        publishDate,
      );

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) created motivational message: ${title}`);

      res.status(201).json({
        message: 'Motivational message created successfully',
        motivationalMessage: newMessage,
      });
    } catch (error) {
      console.error('Motivational message creation error:', error);
      res
        .status(500)
        .json({ message: 'Failed to create motivational message' });
    }
  },

  // Get all motivational messages
  async getAllMessages(req, res) {
    try {
      const messages = await motivationalMessageModel.getAll();
      res.json(messages);
    } catch (error) {
      console.error('Get motivational messages error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve motivational messages' });
    }
  },

  // Update an existing motivational message
  async updateMessage(req, res) {
    try {
      const messageId = parseInt(req.params.id);
      const { title, audioUrl, description, publishDate } = req.body;

      // Validate essential inputs
      if (!title && !audioUrl && !publishDate) {
        return res.status(400).json({ message: 'No update fields provided' });
      }

      // Check if message exists
      const existingMessage = await motivationalMessageModel.getById(messageId);
      if (!existingMessage) {
        return res.status(404).json({ message: 'Motivational message not found' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Update message with provided fields
      const updatedMessage = await motivationalMessageModel.update(
        messageId,
        {
          title: title || existingMessage.title,
          audio_url: audioUrl || existingMessage.audio_url,
          description: description !== undefined ? description : existingMessage.description,
          publish_date: publishDate || existingMessage.publish_date,
        }
      );

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) updated motivational message ID: ${messageId}`);

      res.json({
        message: 'Motivational message updated successfully',
        motivationalMessage: updatedMessage,
      });
    } catch (error) {
      console.error('Update motivational message error:', error);
      res.status(500).json({ message: 'Failed to update motivational message' });
    }
  },

  // Create a new strategy video
  async createVideo(req, res) {
    try {
      const { title, externalUrl, description, isPremium } = req.body;

      // Validate input
      if (!title || !externalUrl) {
        return res
          .status(400)
          .json({ message: 'Title and external URL are required' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Create video
      const newVideo = await strategyVideoModel.create(
        title,
        externalUrl,
        description || null,
        isPremium || false,
      );

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) created strategy video: ${title}`);

      res.status(201).json({
        message: 'Strategy video created successfully',
        video: newVideo,
      });
    } catch (error) {
      console.error('Strategy video creation error:', error);
      res.status(500).json({ message: 'Failed to create strategy video' });
    }
  },

  // Get all strategy videos
  async getAllVideos(req, res) {
    try {
      const isPremium = req.query.premium === 'true';
      const videos = await strategyVideoModel.getAll(isPremium);
      res.json(videos);
    } catch (error) {
      console.error('Get strategy videos error:', error);
      res.status(500).json({ message: 'Failed to retrieve strategy videos' });
    }
  },

  // Update an existing strategy video
  async updateVideo(req, res) {
    try {
      const videoId = parseInt(req.params.id);
      const { title, externalUrl, description, isPremium } = req.body;

      // Validate essential inputs
      if (!title && !externalUrl) {
        return res.status(400).json({ message: 'No update fields provided' });
      }

      // Check if video exists
      const existingVideo = await strategyVideoModel.getById(videoId);
      if (!existingVideo) {
        return res.status(404).json({ message: 'Strategy video not found' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Update video with provided fields
      const updatedVideo = await strategyVideoModel.update(
        videoId,
        {
          title: title || existingVideo.title,
          external_url: externalUrl || existingVideo.external_url,
          description: description !== undefined ? description : existingVideo.description,
          is_premium: isPremium !== undefined ? isPremium : existingVideo.is_premium,
        }
      );

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) updated strategy video ID: ${videoId}`);

      res.json({
        message: 'Strategy video updated successfully',
        video: updatedVideo,
      });
    } catch (error) {
      console.error('Update strategy video error:', error);
      res.status(500).json({ message: 'Failed to update strategy video' });
    }
  },

  // Delete a coaching note
  async deleteNote(req, res) {
    try {
      const noteId = parseInt(req.params.id);

      // Check if note exists
      const existingNote = await coachingNoteModel.getById(noteId);
      if (!existingNote) {
        return res.status(404).json({ message: 'Coaching note not found' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Delete note
      await coachingNoteModel.delete(noteId);

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) deleted coaching note ID: ${noteId}`);

      res.json({
        message: 'Coaching note deleted successfully'
      });
    } catch (error) {
      console.error('Delete coaching note error:', error);
      res.status(500).json({ message: 'Failed to delete coaching note' });
    }
  },

  // Delete a motivational message
  async deleteMessage(req, res) {
    try {
      const messageId = parseInt(req.params.id);

      // Check if message exists
      const existingMessage = await motivationalMessageModel.getById(messageId);
      if (!existingMessage) {
        return res.status(404).json({ message: 'Motivational message not found' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Delete message
      await motivationalMessageModel.delete(messageId);

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) deleted motivational message ID: ${messageId}`);

      res.json({
        message: 'Motivational message deleted successfully'
      });
    } catch (error) {
      console.error('Delete motivational message error:', error);
      res.status(500).json({ message: 'Failed to delete motivational message' });
    }
  },

  // Delete a strategy video
  async deleteVideo(req, res) {
    try {
      const videoId = parseInt(req.params.id);

      // Check if video exists
      const existingVideo = await strategyVideoModel.getById(videoId);
      if (!existingVideo) {
        return res.status(404).json({ message: 'Strategy video not found' });
      }

      // Initialize Supabase client for potential future use
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Delete video
      await strategyVideoModel.delete(videoId);

      // Log admin activity
      console.log(`Admin ${req.user.userId} (${req.user.email}) deleted strategy video ID: ${videoId}`);

      res.json({
        message: 'Strategy video deleted successfully'
      });
    } catch (error) {
      console.error('Delete strategy video error:', error);
      res.status(500).json({ message: 'Failed to delete strategy video' });
    }
  }
};

module.exports = coachingController;
