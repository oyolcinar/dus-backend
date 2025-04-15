const {
  coachingNoteModel,
  motivationalMessageModel,
  strategyVideoModel,
} = require('../models/coachingModels');

const coachingController = {
  // Create a new coaching note
  async createNote(req, res) {
    try {
      const { title, content, publishDate, weekNumber, year } = req.body;

      // Validate input
      if (!title || !content || !publishDate || !weekNumber || !year) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Create note
      const newNote = await coachingNoteModel.create(
        title,
        content,
        publishDate,
        weekNumber,
        year,
      );

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

      // Create message
      const newMessage = await motivationalMessageModel.create(
        title,
        audioUrl,
        description || null,
        publishDate,
      );

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

      // Create video
      const newVideo = await strategyVideoModel.create(
        title,
        externalUrl,
        description || null,
        isPremium || false,
      );

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
};

module.exports = coachingController;
