const courseModel = require('../models/courseModel');
const topicModel = require('../models/topicModel');
const subtopicModel = require('../models/subtopicModel');

const courseController = {
  // Create a new course
  async create(req, res) {
    try {
      const { title, description, imageUrl } = req.body;

      // Validate input
      if (!title) {
        return res.status(400).json({ message: 'Title is required' });
      }

      // Create course
      const newCourse = await courseModel.create(
        title,
        description || null,
        imageUrl || null,
      );

      res.status(201).json({
        message: 'Course created successfully',
        course: newCourse,
      });
    } catch (error) {
      console.error('Course creation error:', error);
      res.status(500).json({ message: 'Failed to create course' });
    }
  },

  // Get all courses
  async getAll(req, res) {
    try {
      const courses = await courseModel.getAll();
      res.json(courses);
    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({ message: 'Failed to retrieve courses' });
    }
  },

  // Get course by ID with topics and subtopics
  async getById(req, res) {
    try {
      const courseId = req.params.id;

      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Get topics for this course
      const topics = await topicModel.getByCourseId(courseId);

      // Get subtopics for each topic
      const topicsWithSubtopics = await Promise.all(
        topics.map(async (topic) => {
          const subtopics = await subtopicModel.getByTopicId(topic.topic_id);
          return {
            ...topic,
            subtopics,
          };
        }),
      );

      res.json({
        ...course,
        topics: topicsWithSubtopics,
      });
    } catch (error) {
      console.error('Get course error:', error);
      res.status(500).json({ message: 'Failed to retrieve course' });
    }
  },

  // Update course
  async update(req, res) {
    try {
      const courseId = req.params.id;
      const { title, description, imageUrl } = req.body;

      // Check if course exists
      const existingCourse = await courseModel.getById(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Update course
      const updatedCourse = await courseModel.update(
        courseId,
        title || existingCourse.title,
        description !== undefined ? description : existingCourse.description,
        imageUrl !== undefined ? imageUrl : existingCourse.image_url,
      );

      res.json({
        message: 'Course updated successfully',
        course: updatedCourse,
      });
    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({ message: 'Failed to update course' });
    }
  },

  // Delete course
  async delete(req, res) {
    try {
      const courseId = req.params.id;

      // Check if course exists
      const existingCourse = await courseModel.getById(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Delete course
      await courseModel.delete(courseId);

      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({ message: 'Failed to delete course' });
    }
  },
};

module.exports = courseController;
