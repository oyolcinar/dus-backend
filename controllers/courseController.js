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

      // Log admin activity
      console.log(
        `Admin ${req.user.userId} (${req.user.email}) created course: ${title}`,
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
      // Check if we should filter courses by subscription type
      const subscriptionType = req.query.subscriptionType;

      let courses;
      if (subscriptionType) {
        courses = await courseModel.getBySubscriptionType(subscriptionType);
      } else {
        courses = await courseModel.getAll();
      }

      // If user is logged in, add info about completed topics/subtopics
      if (req.user) {
        // This capability will be implemented separately if needed
        // For now, we just return the courses
      }

      res.json(courses);
    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({ message: 'Failed to retrieve courses' });
    }
  },

  // Get course by ID with topics and subtopics
  async getById(req, res) {
    try {
      const courseId = parseInt(req.params.id);

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

      // If user is logged in, add progress information for each subtopic
      if (req.user) {
        // This can be implemented in the future to add user-specific progress
        // to each subtopic in the response
      }

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
      const courseId = parseInt(req.params.id);
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

      // Log admin activity
      console.log(
        `Admin ${req.user.userId} (${req.user.email}) updated course ID: ${courseId}`,
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
      const courseId = parseInt(req.params.id);

      // Check if course exists
      const existingCourse = await courseModel.getById(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if course has any topics
      const topics = await topicModel.getByCourseId(courseId);
      if (topics.length > 0) {
        // Get all subtopics for these topics
        let hasSubtopics = false;
        for (const topic of topics) {
          const subtopics = await subtopicModel.getByTopicId(topic.topic_id);
          if (subtopics.length > 0) {
            hasSubtopics = true;
            break;
          }
        }

        // If we have topics with subtopics, it's safer to prevent deletion
        if (hasSubtopics) {
          return res.status(400).json({
            message:
              'Cannot delete course with existing topics and subtopics. Please delete subtopics and topics first.',
          });
        }
      }

      // Delete course
      await courseModel.delete(courseId);

      // Log admin activity
      console.log(
        `Admin ${req.user.userId} (${req.user.email}) deleted course ID: ${courseId}`,
      );

      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({ message: 'Failed to delete course' });
    }
  },

  // Get course progress for current user
  async getUserProgress(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.id);

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Fetch user's progress data for this course
      const progressData = await courseModel.getUserProgress(userId, courseId);

      // Calculate overall course completion percentage
      const completedSubtopics = progressData.completedSubtopics || 0;
      const totalSubtopics = progressData.totalSubtopics || 0;
      const completionPercentage =
        totalSubtopics > 0
          ? Math.round((completedSubtopics / totalSubtopics) * 100)
          : 0;

      res.json({
        courseId,
        userId,
        completedSubtopics,
        totalSubtopics,
        completionPercentage,
        lastAccessed: progressData.lastAccessed,
        topicsProgress: progressData.topicsProgress || [],
      });
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve course progress' });
    }
  },

  // Mark a subtopic as completed
  async markSubtopicCompleted(req, res) {
    try {
      const userId = req.user.userId;
      const { subtopicId } = req.body;

      if (!subtopicId) {
        return res.status(400).json({ message: 'Subtopic ID is required' });
      }

      // Check if subtopic exists
      const subtopic = await subtopicModel.getById(subtopicId);
      if (!subtopic) {
        return res.status(404).json({ message: 'Subtopic not found' });
      }

      // Mark subtopic as completed
      const result = await courseModel.markSubtopicCompleted(
        userId,
        subtopicId,
      );

      res.json({
        message: 'Subtopic marked as completed',
        subtopicId,
        userId,
        completedAt: result.completedAt,
      });
    } catch (error) {
      console.error('Mark subtopic completed error:', error);
      res.status(500).json({ message: 'Failed to mark subtopic as completed' });
    }
  },
};

module.exports = courseController;
