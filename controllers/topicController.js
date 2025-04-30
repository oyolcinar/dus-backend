const topicModel = require('../models/topicModel');
const courseModel = require('../models/courseModel');
const subtopicModel = require('../models/subtopicModel');

const topicController = {
  // Create a new topic
  async create(req, res) {
    try {
      const { courseId, title, description, orderIndex } = req.body;

      // Validate input
      if (!courseId || !title) {
        return res
          .status(400)
          .json({ message: 'Course ID and title are required' });
      }

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Create topic
      const newTopic = await topicModel.create(
        courseId,
        title,
        description || null,
        orderIndex || 0,
      );

      res.status(201).json({
        message: 'Topic created successfully',
        topic: newTopic,
      });
    } catch (error) {
      console.error('Topic creation error:', error);
      res.status(500).json({ message: 'Failed to create topic' });
    }
  },

  // Get topics by course ID
  async getByCourseId(req, res) {
    try {
      const courseId = req.params.courseId;

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const topics = await topicModel.getByCourseId(courseId);
      res.json(topics);
    } catch (error) {
      console.error('Get topics error:', error);
      res.status(500).json({ message: 'Failed to retrieve topics' });
    }
  },

  // Get topic by ID with subtopics
  async getById(req, res) {
    try {
      const topicId = req.params.id;

      const topic = await topicModel.getById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      // Get subtopics for this topic
      const subtopics = await subtopicModel.getByTopicId(topicId);

      res.json({
        ...topic,
        subtopics,
      });
    } catch (error) {
      console.error('Get topic error:', error);
      res.status(500).json({ message: 'Failed to retrieve topic' });
    }
  },

  // Update topic
  async update(req, res) {
    try {
      const topicId = req.params.id;
      const { title, description, orderIndex } = req.body;

      // Check if topic exists
      const existingTopic = await topicModel.getById(topicId);
      if (!existingTopic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      // Update topic
      const updatedTopic = await topicModel.update(
        topicId,
        title || existingTopic.title,
        description !== undefined ? description : existingTopic.description,
        orderIndex !== undefined ? orderIndex : existingTopic.order_index,
      );

      res.json({
        message: 'Topic updated successfully',
        topic: updatedTopic,
      });
    } catch (error) {
      console.error('Update topic error:', error);
      res.status(500).json({ message: 'Failed to update topic' });
    }
  },

  // Delete topic
  async delete(req, res) {
    try {
      const topicId = req.params.id;

      // Check if topic exists
      const existingTopic = await topicModel.getById(topicId);
      if (!existingTopic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      // Check if topic has subtopics
      const subtopics = await subtopicModel.getByTopicId(topicId);
      if (subtopics && subtopics.length > 0) {
        return res.status(400).json({
          message: `Cannot delete topic because it has ${subtopics.length} subtopics. Delete all subtopics first or use the cascade delete option.`,
        });
      }

      // Delete topic
      await topicModel.delete(topicId);

      res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
      console.error('Delete topic error:', error);

      // Provide more specific error message if it's related to existing subtopics
      if (error.message && error.message.includes('Cannot delete topic')) {
        return res.status(400).json({
          message: error.message,
        });
      }

      res.status(500).json({ message: 'Failed to delete topic' });
    }
  },
};

module.exports = topicController;
