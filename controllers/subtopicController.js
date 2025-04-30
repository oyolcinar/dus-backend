const subtopicModel = require('../models/subtopicModel');
const topicModel = require('../models/topicModel');

const subtopicController = {
  // Create a new subtopic
  async create(req, res) {
    try {
      const { topicId, title, description, orderIndex } = req.body;

      // Validate input
      if (!topicId || !title) {
        return res
          .status(400)
          .json({ message: 'Topic ID and title are required' });
      }

      // Check authorization
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res
          .status(403)
          .json({ message: 'You do not have permission to create subtopics' });
      }

      // Check if topic exists
      const topic = await topicModel.getById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      // Create subtopic
      const newSubtopic = await subtopicModel.create(
        topicId,
        title,
        description || null,
        orderIndex || 0,
      );

      res.status(201).json({
        message: 'Subtopic created successfully',
        subtopic: newSubtopic,
      });
    } catch (error) {
      console.error('Subtopic creation error:', error);
      res.status(500).json({ message: 'Failed to create subtopic' });
    }
  },

  // Get subtopics by topic ID
  async getByTopicId(req, res) {
    try {
      const topicId = req.params.topicId;

      // Check if topic exists
      const topic = await topicModel.getById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      const subtopics = await subtopicModel.getByTopicId(topicId);
      res.json(subtopics);
    } catch (error) {
      console.error('Get subtopics error:', error);
      res.status(500).json({ message: 'Failed to retrieve subtopics' });
    }
  },

  // Get subtopic by ID
  async getById(req, res) {
    try {
      const subtopicId = req.params.id;

      const subtopic = await subtopicModel.getById(subtopicId);
      if (!subtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }

      res.json(subtopic);
    } catch (error) {
      console.error('Get subtopic error:', error);
      res.status(500).json({ message: 'Failed to retrieve subtopic' });
    }
  },

  // Update subtopic
  async update(req, res) {
    try {
      const subtopicId = req.params.id;
      const { title, description, orderIndex } = req.body;

      // Check authorization
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res
          .status(403)
          .json({ message: 'You do not have permission to update subtopics' });
      }

      // Check if subtopic exists
      const existingSubtopic = await subtopicModel.getById(subtopicId);
      if (!existingSubtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }

      // Update subtopic
      const updatedSubtopic = await subtopicModel.update(
        subtopicId,
        title || existingSubtopic.title,
        description !== undefined ? description : existingSubtopic.description,
        orderIndex !== undefined ? orderIndex : existingSubtopic.order_index,
      );

      res.json({
        message: 'Subtopic updated successfully',
        subtopic: updatedSubtopic,
      });
    } catch (error) {
      console.error('Update subtopic error:', error);
      res.status(500).json({ message: 'Failed to update subtopic' });
    }
  },

  // Delete subtopic
  async delete(req, res) {
    try {
      const subtopicId = req.params.id;

      // Check authorization
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res
          .status(403)
          .json({ message: 'You do not have permission to delete subtopics' });
      }

      // Check if subtopic exists
      const existingSubtopic = await subtopicModel.getById(subtopicId);
      if (!existingSubtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }

      // Delete subtopic
      await subtopicModel.delete(subtopicId);

      res.json({ message: 'Subtopic deleted successfully' });
    } catch (error) {
      console.error('Delete subtopic error:', error);

      // Provide more specific error message if deletion fails due to dependencies
      if (error.message && error.message.includes('referenced')) {
        return res.status(400).json({
          message:
            'Cannot delete subtopic because it is referenced by other items. Remove those references first.',
        });
      }

      res.status(500).json({ message: 'Failed to delete subtopic' });
    }
  },

  // Reorder subtopics
  async reorderSubtopics(req, res) {
    try {
      const topicId = req.params.topicId;
      const { subtopicOrders } = req.body;

      // Validate input
      if (
        !topicId ||
        !subtopicOrders ||
        !Array.isArray(subtopicOrders) ||
        subtopicOrders.length === 0
      ) {
        return res.status(400).json({
          message: 'Topic ID and subtopic orders array are required',
        });
      }

      // Check authorization
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res
          .status(403)
          .json({ message: 'You do not have permission to reorder subtopics' });
      }

      // Check if topic exists
      const topic = await topicModel.getById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      // Validate each item in the subtopicOrders array
      for (const item of subtopicOrders) {
        if (!item.subtopicId || item.orderIndex === undefined) {
          return res.status(400).json({
            message:
              'Each item in subtopicOrders must have subtopicId and orderIndex',
          });
        }
      }

      // Reorder subtopics
      const updatedSubtopics = await subtopicModel.reorder(
        topicId,
        subtopicOrders,
      );

      res.json({
        message: 'Subtopics reordered successfully',
        subtopics: updatedSubtopics,
      });
    } catch (error) {
      console.error('Reorder subtopics error:', error);
      res.status(500).json({ message: 'Failed to reorder subtopics' });
    }
  },

  // Get user progress for a subtopic
  async getUserProgress(req, res) {
    try {
      const userId = req.user.userId;
      const subtopicId = req.params.subtopicId;

      // Check if subtopic exists
      const subtopic = await subtopicModel.getById(subtopicId);
      if (!subtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }

      const progress = await subtopicModel.getUserProgress(userId, subtopicId);

      res.json(progress || { message: 'No progress found for this subtopic' });
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve user progress' });
    }
  },
};

module.exports = subtopicController;
