const topicModel = require('../models/topicModel');
const courseModel = require('../models/courseModel');
const subtopicModel = require('../models/subtopicModel');

const topicController = {
  // ===============================
  // TOPIC CRUD OPERATIONS
  // ===============================

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

      // Log activity
      console.log(
        `User ${req.user?.userId} created topic: ${title} for course ${course.title}`,
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

  // Get all topics
  async getAll(req, res) {
    try {
      const { courseId, page, limit } = req.query;

      let topics;
      if (courseId) {
        if (page && limit) {
          const paginatedResult = await topicModel.getByCourseIdPaginated(
            courseId,
            parseInt(page),
            parseInt(limit),
          );
          res.json(paginatedResult);
          return;
        } else {
          topics = await topicModel.getByCourseId(courseId);
        }
      } else {
        topics = await topicModel.getAll();
      }

      res.json(topics);
    } catch (error) {
      console.error('Get topics error:', error);
      res.status(500).json({ message: 'Failed to retrieve topics' });
    }
  },

  // Get topics by course ID
  async getByCourseId(req, res) {
    try {
      const courseId = req.params.courseId;
      const { withSubtopics = false, withCount = false } = req.query;

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      let topics;
      if (withCount === 'true') {
        topics = await topicModel.getTopicsWithSubtopicCount(courseId);
      } else {
        topics = await topicModel.getByCourseId(courseId);
      }

      // Add subtopics if requested
      if (withSubtopics === 'true') {
        const topicsWithSubtopics = await Promise.all(
          topics.map(async (topic) => {
            const subtopics = await subtopicModel.getByTopicId(topic.topic_id);
            return {
              ...topic,
              subtopics,
            };
          }),
        );
        topics = topicsWithSubtopics;
      }

      res.json({
        course: {
          courseId: course.course_id,
          title: course.title,
          courseType: course.course_type,
        },
        topics,
        totalTopics: topics.length,
      });
    } catch (error) {
      console.error('Get topics by course error:', error);
      res.status(500).json({ message: 'Failed to retrieve topics for course' });
    }
  },

  // Get topic by ID with subtopics
  async getById(req, res) {
    try {
      const topicId = req.params.id;
      const { withSubtopics = true, withCourse = false } = req.query;

      let topic;
      if (withCourse === 'true') {
        topic = await topicModel.getByIdWithCourse(topicId);
      } else {
        topic = await topicModel.getById(topicId);
      }

      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      // Add subtopics if requested
      let subtopics = [];
      if (withSubtopics === 'true') {
        subtopics = await subtopicModel.getByTopicId(topicId);
      }

      res.json({
        ...topic,
        subtopics,
        subtopicCount: subtopics.length,
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

      // Log activity
      console.log(`User ${req.user?.userId} updated topic ID: ${topicId}`);

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
          message: `Cannot delete topic because it has ${subtopics.length} subtopics. Delete all subtopics first.`,
        });
      }

      // Delete topic
      await topicModel.delete(topicId);

      // Log activity
      console.log(
        `User ${req.user?.userId} deleted topic ID: ${topicId} (${existingTopic.title})`,
      );

      res.json({
        message: 'Topic deleted successfully',
        deletedTopic: {
          topicId: existingTopic.topic_id,
          title: existingTopic.title,
        },
      });
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

  // ===============================
  // TOPIC MANAGEMENT OPERATIONS
  // ===============================

  // Reorder topics within a course
  async reorderTopics(req, res) {
    try {
      const { courseId } = req.params;
      const { topicOrders } = req.body;

      // Validate input
      if (!topicOrders || !Array.isArray(topicOrders)) {
        return res.status(400).json({
          message: 'Topic orders array is required',
        });
      }

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Reorder topics
      const reorderedTopics = await topicModel.reorder(courseId, topicOrders);

      // Log activity
      console.log(
        `User ${req.user?.userId} reordered topics for course: ${course.title}`,
      );

      res.json({
        message: 'Topics reordered successfully',
        course: {
          courseId: course.course_id,
          title: course.title,
        },
        topics: reorderedTopics,
      });
    } catch (error) {
      console.error('Reorder topics error:', error);
      res.status(500).json({ message: 'Failed to reorder topics' });
    }
  },

  // Bulk create topics for a course
  async bulkCreate(req, res) {
    try {
      const { courseId } = req.params;
      const { topics } = req.body;

      // Validate input
      if (!topics || !Array.isArray(topics) || topics.length === 0) {
        return res.status(400).json({
          message: 'Topics array is required and must not be empty',
        });
      }

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Validate each topic
      for (const topic of topics) {
        if (!topic.title) {
          return res.status(400).json({
            message: 'Each topic must have a title',
          });
        }
      }

      // Bulk create topics
      const createdTopics = await topicModel.bulkCreate(courseId, topics);

      // Log activity
      console.log(
        `User ${req.user?.userId} bulk created ${createdTopics.length} topics for course: ${course.title}`,
      );

      res.status(201).json({
        message: `Successfully created ${createdTopics.length} topics`,
        course: {
          courseId: course.course_id,
          title: course.title,
        },
        topics: createdTopics,
      });
    } catch (error) {
      console.error('Bulk create topics error:', error);
      res.status(500).json({ message: 'Failed to bulk create topics' });
    }
  },

  // ===============================
  // TOPIC ANALYTICS & SEARCH
  // ===============================

  // Get topic statistics
  async getTopicStats(req, res) {
    try {
      const topicId = req.params.id;

      // Check if topic exists
      const topic = await topicModel.getById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }

      // Get topic statistics
      const stats = await topicModel.getTopicStats(topicId);

      res.json({
        topic: {
          topicId: topic.topic_id,
          title: topic.title,
          description: topic.description,
          orderIndex: topic.order_index,
        },
        statistics: stats,
      });
    } catch (error) {
      console.error('Get topic statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve topic statistics' });
    }
  },

  // Search topics by title
  async searchTopics(req, res) {
    try {
      const { q: searchTerm, courseId, limit = 50 } = req.query;

      if (!searchTerm) {
        return res.status(400).json({ message: 'Search term is required' });
      }

      const topics = await topicModel.searchByTitle(
        searchTerm,
        courseId || null,
        parseInt(limit),
      );

      res.json({
        searchTerm,
        courseId: courseId || null,
        topics,
        totalResults: topics.length,
      });
    } catch (error) {
      console.error('Search topics error:', error);
      res.status(500).json({ message: 'Failed to search topics' });
    }
  },

  // Get next order index for a course
  async getNextOrderIndex(req, res) {
    try {
      const { courseId } = req.params;

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const nextOrderIndex = await topicModel.getNextOrderIndex(courseId);

      res.json({
        courseId: parseInt(courseId),
        nextOrderIndex,
      });
    } catch (error) {
      console.error('Get next order index error:', error);
      res.status(500).json({ message: 'Failed to get next order index' });
    }
  },

  // ===============================
  // LEGACY/DEPRECATED ENDPOINTS
  // ===============================

  // Note: All study-related functionality has been moved to course-level
  // These endpoints would return deprecation notices if they existed in the old system

  async getTopicStudyProgress(req, res) {
    res.status(410).json({
      message: 'Topic-based study progress tracking has been deprecated.',
      suggestion:
        'Use course-based progress tracking instead: /api/courses/:id/progress',
      migration:
        'The system now tracks study progress at the course level rather than topic level.',
    });
  },

  async startTopicStudySession(req, res) {
    res.status(410).json({
      message: 'Topic-based study sessions have been deprecated.',
      suggestion:
        'Use course-based study sessions instead: /api/courses/:id/start-studying',
      migration:
        'The system now manages study sessions at the course level rather than topic level.',
    });
  },

  async updateTopicProgress(req, res) {
    res.status(410).json({
      message: 'Topic-based progress updates have been deprecated.',
      suggestion:
        'Use course-based progress updates instead: /api/courses/:id/progress',
      migration:
        'Progress tracking is now handled at the course level with aggregated topic data.',
    });
  },
};

module.exports = topicController;
