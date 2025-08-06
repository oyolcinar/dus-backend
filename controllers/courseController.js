const courseModel = require('../models/courseModel');
const topicModel = require('../models/topicModel');
const subtopicModel = require('../models/subtopicModel');
const {
  courseSessionModel,
  courseProgressModel,
} = require('../models/studyModels');

const courseController = {
  // ===============================
  // COURSE CRUD OPERATIONS
  // ===============================

  // Create a new course
  async create(req, res) {
    try {
      const { title, description, imageUrl, courseType, nicknames } = req.body;

      // Validate input
      if (!title) {
        return res.status(400).json({ message: 'Title is required' });
      }

      // Validate courseType if provided
      if (
        courseType &&
        !['temel_dersler', 'klinik_dersler'].includes(courseType)
      ) {
        return res.status(400).json({
          message:
            'Course type must be either "temel_dersler" or "klinik_dersler"',
        });
      }

      // Create course
      const newCourse = await courseModel.create(
        title,
        description || null,
        imageUrl || null,
        courseType || 'temel_dersler',
        nicknames || null,
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
      // Check if we should filter courses by subscription type or course type
      const subscriptionType = req.query.subscriptionType;
      const courseType = req.query.courseType;
      const withProgress = req.query.withProgress === 'true';

      let courses;
      if (courseType) {
        courses = await courseModel.getByType(courseType);
      } else if (subscriptionType) {
        courses = await courseModel.getBySubscriptionType(subscriptionType);
      } else {
        courses = await courseModel.getAll();
      }

      // If user is logged in and progress is requested, add progress data
      if (req.user && withProgress) {
        const coursesWithProgress = await courseModel.getCoursesWithProgress(
          req.user.userId,
        );
        res.json(coursesWithProgress);
      } else {
        res.json(courses);
      }
    } catch (error) {
      console.error('Get courses error:', error);
      res.status(500).json({ message: 'Failed to retrieve courses' });
    }
  },

  // Get courses by type
  async getByType(req, res) {
    try {
      const { courseType } = req.params;

      // Validate course type
      if (!['temel_dersler', 'klinik_dersler'].includes(courseType)) {
        return res.status(400).json({
          message:
            'Course type must be either "temel_dersler" or "klinik_dersler"',
        });
      }

      const courses = await courseModel.getByType(courseType);
      res.json(courses);
    } catch (error) {
      console.error('Get courses by type error:', error);
      res.status(500).json({ message: 'Failed to retrieve courses by type' });
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

      // If user is logged in, add progress information
      let userProgress = null;
      if (req.user) {
        userProgress = await courseModel.getUserProgress(
          req.user.userId,
          courseId,
        );
      }

      res.json({
        ...course,
        topics: topicsWithSubtopics,
        userProgress,
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
      const { title, description, imageUrl, courseType, nicknames } = req.body;

      // Check if course exists
      const existingCourse = await courseModel.getById(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Validate courseType if provided
      if (
        courseType &&
        !['temel_dersler', 'klinik_dersler'].includes(courseType)
      ) {
        return res.status(400).json({
          message:
            'Course type must be either "temel_dersler" or "klinik_dersler"',
        });
      }

      // Update course
      const updatedCourse = await courseModel.update(
        courseId,
        title !== undefined ? title : existingCourse.title,
        description !== undefined ? description : existingCourse.description,
        imageUrl !== undefined ? imageUrl : existingCourse.image_url,
        courseType !== undefined ? courseType : existingCourse.course_type,
        nicknames !== undefined ? nicknames : existingCourse.nicknames,
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

  // ===============================
  // COURSE STUDY SESSION MANAGEMENT
  // ===============================

  // Start studying a course
  async startStudying(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.id);
      const { notes } = req.body;

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check for existing active session
      const activeSession = await courseSessionModel.getActiveSession(userId);
      if (activeSession) {
        return res.status(400).json({
          message:
            'An active study session already exists. Please end it first.',
          activeSession: {
            sessionId: activeSession.session_id,
            courseId: activeSession.course_id,
            courseTitle: activeSession.courses?.title,
            startTime: activeSession.start_time,
          },
        });
      }

      // Start new session
      const session = await courseSessionModel.startSession(
        userId,
        courseId,
        notes,
      );

      res.status(201).json({
        message: 'Course study session started successfully',
        session: {
          sessionId: session.session_id,
          courseId: session.course_id,
          courseTitle: course.title,
          startTime: session.start_time,
          notes: session.notes,
        },
      });
    } catch (error) {
      console.error('Start course study error:', error);
      res.status(500).json({ message: 'Failed to start course study session' });
    }
  },

  // Get user's study sessions for a course
  async getCourseStudySessions(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.id);
      const { limit = 20 } = req.query;

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Get user's sessions for this course
      const sessions = await courseSessionModel.getCourseSessions(
        userId,
        courseId,
        parseInt(limit),
      );

      // Transform session data
      const transformedSessions = sessions.map((session) => ({
        sessionId: session.session_id,
        startTime: session.start_time,
        endTime: session.end_time,
        studyDurationSeconds: session.study_duration_seconds,
        breakDurationSeconds: session.break_duration_seconds,
        totalDurationSeconds: session.total_duration_seconds,
        studyDurationMinutes:
          Math.round(((session.study_duration_seconds || 0) / 60) * 10) / 10,
        breakDurationMinutes:
          Math.round(((session.break_duration_seconds || 0) / 60) * 10) / 10,
        sessionDate: session.session_date,
        sessionStatus: session.session_status,
        notes: session.notes,
      }));

      res.json({
        course: {
          courseId: course.course_id,
          title: course.title,
          courseType: course.course_type,
        },
        sessions: transformedSessions,
        totalSessions: transformedSessions.length,
      });
    } catch (error) {
      console.error('Get course study sessions error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve course study sessions' });
    }
  },

  // ===============================
  // COURSE PROGRESS MANAGEMENT
  // ===============================

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

      // Get user's progress for this course
      const progressData = await courseModel.getUserProgress(userId, courseId);

      res.json({
        course: {
          courseId: course.course_id,
          title: course.title,
          description: course.description,
          courseType: course.course_type,
        },
        progress: progressData,
      });
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve course progress' });
    }
  },

  // Update course progress
  async updateCourseProgress(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.id);
      const progressData = req.body;

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Update progress
      const updatedProgress = await courseModel.updateCourseProgress(
        userId,
        courseId,
        progressData,
      );

      res.json({
        message: 'Course progress updated successfully',
        course: {
          courseId: course.course_id,
          title: course.title,
        },
        progress: updatedProgress,
      });
    } catch (error) {
      console.error('Update course progress error:', error);
      res.status(500).json({ message: 'Failed to update course progress' });
    }
  },

  // Mark course as completed
  async markCourseCompleted(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.id);

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Mark course as completed
      const completedCourse = await courseModel.markCourseCompleted(
        userId,
        courseId,
      );

      res.json({
        message: 'Course marked as completed successfully',
        course: {
          courseId: completedCourse.courseId,
          title: course.title,
          completedAt: completedCourse.completedAt,
          completionPercentage: completedCourse.completionPercentage,
        },
      });
    } catch (error) {
      console.error('Mark course completed error:', error);
      res.status(500).json({ message: 'Failed to mark course as completed' });
    }
  },

  // ===============================
  // COURSE ANALYTICS & STATISTICS
  // ===============================

  // Get course statistics
  async getCourseStats(req, res) {
    try {
      const courseId = parseInt(req.params.id);

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Get course statistics
      const stats = await courseModel.getCourseStats(courseId);

      res.json({
        course: {
          courseId: course.course_id,
          title: course.title,
          courseType: course.course_type,
        },
        statistics: stats,
      });
    } catch (error) {
      console.error('Get course statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve course statistics' });
    }
  },

  // Get trending courses
  async getTrendingCourses(req, res) {
    try {
      const { limit = 10 } = req.query;

      const trendingCourses = await courseModel.getTrendingCourses(
        parseInt(limit),
      );

      res.json({
        trendingCourses: trendingCourses.map((course) => ({
          courseId: course.course_id,
          title: course.title,
          description: course.description,
          courseType: course.course_type,
          imageUrl: course.image_url,
          sessionCount: course.session_count,
          trending: true,
        })),
      });
    } catch (error) {
      console.error('Get trending courses error:', error);
      res.status(500).json({ message: 'Failed to retrieve trending courses' });
    }
  },

  // Get user's course overview
  async getUserCourseOverview(req, res) {
    try {
      const userId = req.user.userId;

      // Get all user's course progress
      const allProgress = await courseModel.getAllUserProgress(userId);

      // Calculate summary statistics
      const totalCourses = allProgress.length;
      const studiedCourses = allProgress.filter(
        (c) => c.studyTimeSeconds > 0,
      ).length;
      const completedCourses = allProgress.filter((c) => c.isCompleted).length;
      const totalStudyTime = allProgress.reduce(
        (sum, c) => sum + c.studyTimeSeconds,
        0,
      );
      const totalSessions = allProgress.reduce(
        (sum, c) => sum + c.sessionCount,
        0,
      );

      res.json({
        overview: {
          totalCourses,
          studiedCourses,
          completedCourses,
          totalStudyTimeHours: Math.round((totalStudyTime / 3600) * 100) / 100,
          totalSessions,
          averageCompletionPercentage:
            studiedCourses > 0
              ? Math.round(
                  (allProgress.reduce(
                    (sum, c) => sum + c.completionPercentage,
                    0,
                  ) /
                    studiedCourses) *
                    10,
                ) / 10
              : 0,
        },
        courses: allProgress,
      });
    } catch (error) {
      console.error('Get user course overview error:', error);
      res.status(500).json({ message: 'Failed to retrieve course overview' });
    }
  },

  // ===============================
  // PREFERRED COURSE MANAGEMENT
  // ===============================

  // Set user's preferred course
  async setPreferredCourse(req, res) {
    try {
      const userId = req.user.userId;
      const courseId = parseInt(req.params.id);

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Set as preferred course
      await courseModel.setUserPreferredCourse(userId, courseId);

      res.json({
        message: 'Preferred course set successfully',
        preferredCourse: {
          courseId: course.course_id,
          title: course.title,
          courseType: course.course_type,
        },
      });
    } catch (error) {
      console.error('Set preferred course error:', error);
      res.status(500).json({ message: 'Failed to set preferred course' });
    }
  },

  // Get user's preferred course
  async getPreferredCourse(req, res) {
    try {
      const userId = req.user.userId;

      const preferredCourse = await courseModel.getUserPreferredCourse(userId);

      res.json({
        preferredCourse: preferredCourse
          ? {
              courseId: preferredCourse.course_id,
              title: preferredCourse.title,
              description: preferredCourse.description,
              courseType: preferredCourse.course_type,
              imageUrl: preferredCourse.image_url,
            }
          : null,
      });
    } catch (error) {
      console.error('Get preferred course error:', error);
      res.status(500).json({ message: 'Failed to retrieve preferred course' });
    }
  },

  // ===============================
  // LEGACY COMPATIBILITY (Deprecated)
  // ===============================

  // Legacy: Mark a subtopic as completed (now deprecated)
  async markSubtopicCompleted(req, res) {
    try {
      // This endpoint is deprecated in the course-based system
      // Subtopic completion should be tracked differently or not at all

      res.status(410).json({
        message:
          'This endpoint is deprecated. The system now uses course-based progress tracking instead of subtopic completion.',
        suggestion:
          'Use /api/courses/:id/progress to update course progress instead.',
      });
    } catch (error) {
      console.error('Mark subtopic completed error (deprecated):', error);
      res.status(500).json({ message: 'This endpoint is no longer supported' });
    }
  },
};

module.exports = courseController;
