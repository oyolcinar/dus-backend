const {
  progressModel,
  sessionModel,
  errorAnalyticsModel,
} = require('../models/studyModels');
const subtopicModel = require('../models/subtopicModel');

const studyController = {
  // Update study progress
  async updateProgress(req, res) {
    try {
      const userId = req.user.userId;
      const { subtopicId, repetitionCount, masteryLevel } = req.body;

      // Validate input
      if (
        !subtopicId ||
        repetitionCount === undefined ||
        masteryLevel === undefined
      ) {
        return res
          .status(400)
          .json({
            message:
              'Subtopic ID, repetition count, and mastery level are required',
          });
      }

      // Check if subtopic exists
      const subtopic = await subtopicModel.getById(subtopicId);
      if (!subtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }

      // Update progress
      const progress = await progressModel.updateProgress(
        userId,
        subtopicId,
        repetitionCount,
        masteryLevel,
      );

      res.json({
        message: 'Progress updated successfully',
        progress,
      });
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({ message: 'Failed to update progress' });
    }
  },

  // Get user's progress
  async getUserProgress(req, res) {
    try {
      const userId = req.user.userId;

      const progress = await progressModel.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error('Get progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve progress' });
    }
  },

  // Start a study session
  async startSession(req, res) {
    try {
      const userId = req.user.userId;

      const session = await sessionModel.startSession(userId);
      res.json({
        message: 'Study session started',
        session,
      });
    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({ message: 'Failed to start study session' });
    }
  },

  // End a study session
  async endSession(req, res) {
    try {
      const sessionId = req.params.id;

      const session = await sessionModel.endSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      res.json({
        message: 'Study session ended',
        session,
      });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ message: 'Failed to end study session' });
    }
  },

  // Add session detail
  async addSessionDetail(req, res) {
    try {
      const sessionId = req.params.id;
      const { subtopicId, duration } = req.body;

      // Validate input
      if (!subtopicId || duration === undefined) {
        return res
          .status(400)
          .json({ message: 'Subtopic ID and duration are required' });
      }

      // Add session detail
      const detail = await sessionModel.addSessionDetail(
        sessionId,
        subtopicId,
        duration,
      );

      res.json({
        message: 'Session detail added',
        detail,
      });
    } catch (error) {
      console.error('Add session detail error:', error);
      res.status(500).json({ message: 'Failed to add session detail' });
    }
  },

  // Get user's study sessions
  async getUserSessions(req, res) {
    try {
      const userId = req.user.userId;

      const sessions = await sessionModel.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({ message: 'Failed to retrieve study sessions' });
    }
  },

  // Get session details
  async getSessionDetails(req, res) {
    try {
      const sessionId = req.params.id;

      const details = await sessionModel.getSessionDetails(sessionId);
      res.json(details);
    } catch (error) {
      console.error('Get session details error:', error);
      res.status(500).json({ message: 'Failed to retrieve session details' });
    }
  },

  // Get study statistics
  async getStudyStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await sessionModel.getStudyStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Get study stats error:', error);
      res.status(500).json({ message: 'Failed to retrieve study statistics' });
    }
  },

  // Update error analytics
  async updateErrorAnalytics(req, res) {
    try {
      const userId = req.user.userId;
      const { subtopicId, isError } = req.body;

      // Validate input
      if (!subtopicId || isError === undefined) {
        return res
          .status(400)
          .json({ message: 'Subtopic ID and error status are required' });
      }

      // Update error analytics
      const analytics = await errorAnalyticsModel.updateErrorAnalytics(
        userId,
        subtopicId,
        isError,
      );

      res.json({
        message: 'Error analytics updated',
        analytics,
      });
    } catch (error) {
      console.error('Update error analytics error:', error);
      res.status(500).json({ message: 'Failed to update error analytics' });
    }
  },

  // Get user's error analytics
  async getUserErrorAnalytics(req, res) {
    try {
      const userId = req.user.userId;

      const analytics = await errorAnalyticsModel.getUserErrorAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error('Get error analytics error:', error);
      res.status(500).json({ message: 'Failed to retrieve error analytics' });
    }
  },
};

module.exports = studyController;
