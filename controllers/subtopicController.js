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
      res.status(500).json({ message: 'Failed to delete subtopic' });
    }
  },
};

module.exports = subtopicController;
