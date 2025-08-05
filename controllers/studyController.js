const {
  courseSessionModel,
  courseProgressModel,
} = require('../models/studyModels');
const courseModel = require('../models/courseModel');
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const studyController = {
  // ===============================
  // COURSE STUDY SESSION MANAGEMENT
  // ===============================

  // Start a study session for a course
  async startStudySession(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId, notes } = req.body;

      // Validate input
      if (!courseId) {
        return res.status(400).json({
          message: 'Course ID is required',
        });
      }

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({
          message: 'Course not found',
        });
      }

      // Check for active session for this user (any course)
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
        message: 'Study session started successfully',
        session: {
          sessionId: session.session_id,
          courseId: session.course_id,
          courseTitle: course.title,
          startTime: session.start_time,
          notes: session.notes,
        },
      });
    } catch (error) {
      console.error('Start study session error:', error);
      res.status(500).json({ message: 'Failed to start study session' });
    }
  },

  // End a study session
  async endStudySession(req, res) {
    try {
      const { sessionId } = req.params;
      const { notes } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          message: 'Session ID is required',
        });
      }

      // End session
      const session = await courseSessionModel.endSession(parseInt(sessionId));

      if (!session) {
        return res.status(404).json({
          message: 'Session not found or already ended',
        });
      }

      // Update notes if provided
      if (notes) {
        await supabase
          .from('user_course_study_sessions')
          .update({ notes: notes })
          .eq('session_id', sessionId);
      }

      res.json({
        message: 'Study session ended successfully',
        session: {
          sessionId: session.session_id,
          courseId: session.course_id,
          startTime: session.start_time,
          endTime: session.end_time,
          studyDurationSeconds: session.study_duration_seconds,
          breakDurationSeconds: session.break_duration_seconds,
          totalDurationSeconds: session.total_duration_seconds,
          studyDurationMinutes:
            Math.round(((session.study_duration_seconds || 0) / 60) * 10) / 10,
          breakDurationMinutes:
            Math.round(((session.break_duration_seconds || 0) / 60) * 10) / 10,
        },
      });
    } catch (error) {
      console.error('End study session error:', error);
      res.status(500).json({ message: 'Failed to end study session' });
    }
  },

  // Add break time to active session
  async addBreakTime(req, res) {
    try {
      const { sessionId } = req.params;
      const { breakDurationSeconds } = req.body;
      const userId = req.user.userId;

      if (!sessionId || !breakDurationSeconds) {
        return res.status(400).json({
          message: 'Session ID and break duration are required',
        });
      }

      if (breakDurationSeconds <= 0) {
        return res.status(400).json({
          message: 'Break duration must be positive',
        });
      }

      // Verify session belongs to user and is active
      const { data: session, error } = await supabase
        .from('user_course_study_sessions')
        .select('session_id, user_id, session_status')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .eq('session_status', 'active')
        .single();

      if (error || !session) {
        return res.status(404).json({
          message: 'Active session not found',
        });
      }

      // Add break time
      const updatedSession = await courseSessionModel.addBreakTime(
        parseInt(sessionId),
        parseInt(breakDurationSeconds),
      );

      res.json({
        message: 'Break time added successfully',
        breakDurationSeconds: parseInt(breakDurationSeconds),
        breakDurationMinutes: Math.round((breakDurationSeconds / 60) * 10) / 10,
        totalBreakSeconds: updatedSession.break_duration_seconds,
        totalBreakMinutes:
          Math.round(((updatedSession.break_duration_seconds || 0) / 60) * 10) /
          10,
      });
    } catch (error) {
      console.error('Add break time error:', error);
      res.status(500).json({ message: 'Failed to add break time' });
    }
  },

  // Get active study session
  async getActiveStudySession(req, res) {
    try {
      const userId = req.user.userId;

      const activeSession = await courseSessionModel.getActiveSession(userId);

      if (!activeSession) {
        return res.json({ activeSession: null });
      }

      // Calculate current duration
      const startTime = new Date(activeSession.start_time);
      const currentTime = new Date();
      const currentDurationSeconds = Math.floor(
        (currentTime - startTime) / 1000,
      );
      const breakDurationSeconds = activeSession.break_duration_seconds || 0;
      const currentStudyDurationSeconds = Math.max(
        0,
        currentDurationSeconds - breakDurationSeconds,
      );

      res.json({
        activeSession: {
          sessionId: activeSession.session_id,
          courseId: activeSession.course_id,
          courseTitle: activeSession.courses?.title,
          courseDescription: activeSession.courses?.description,
          startTime: activeSession.start_time,
          currentDurationSeconds,
          currentStudyDurationSeconds,
          breakDurationSeconds,
          currentDurationMinutes:
            Math.round((currentDurationSeconds / 60) * 10) / 10,
          currentStudyDurationMinutes:
            Math.round((currentStudyDurationSeconds / 60) * 10) / 10,
          breakDurationMinutes:
            Math.round((breakDurationSeconds / 60) * 10) / 10,
          notes: activeSession.notes,
        },
      });
    } catch (error) {
      console.error('Get active study session error:', error);
      res.status(500).json({ message: 'Failed to get active study session' });
    }
  },

  // Get user's study sessions with pagination
  async getUserStudySessions(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, courseId } = req.query;

      let sessions;
      if (courseId) {
        sessions = await courseSessionModel.getCourseSessions(
          userId,
          courseId,
          parseInt(limit),
        );
      } else {
        sessions = await courseSessionModel.getUserSessions(
          userId,
          parseInt(limit),
        );
      }

      // Transform sessions data
      const transformedSessions = sessions.map((session) => ({
        sessionId: session.session_id,
        courseId: session.course_id,
        courseTitle: session.courses?.title,
        courseDescription: session.courses?.description,
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
        sessions: transformedSessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: transformedSessions.length,
        },
      });
    } catch (error) {
      console.error('Get user study sessions error:', error);
      res.status(500).json({ message: 'Failed to retrieve study sessions' });
    }
  },

  // ===============================
  // COURSE PROGRESS MANAGEMENT
  // ===============================

  // Update user course progress
  async updateUserCourseProgress(req, res) {
    try {
      const userId = req.user.userId;
      const {
        courseId,
        tekrarSayisi,
        konuKaynaklari,
        soruBankasiKaynaklari,
        difficultyRating,
        completionPercentage,
        notes,
        isCompleted,
      } = req.body;

      // Validate input
      if (!courseId) {
        return res.status(400).json({
          message: 'Course ID is required',
        });
      }

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({
          message: 'Course not found',
        });
      }

      // Update course progress
      const progressData = await courseProgressModel.updateProgress(
        userId,
        courseId,
        tekrarSayisi,
        difficultyRating,
        completionPercentage,
      );

      // Update course sources if provided
      if (konuKaynaklari || soruBankasiKaynaklari) {
        await courseProgressModel.updateCourseSources(
          userId,
          courseId,
          konuKaynaklari,
          soruBankasiKaynaklari,
        );
      }

      // Mark as completed if specified
      if (isCompleted) {
        await courseProgressModel.markCourseCompleted(userId, courseId);
      }

      res.json({
        message: 'Course progress updated successfully',
        progress: {
          courseId,
          userId,
          tekrarSayisi: progressData.tekrar_sayisi,
          difficultyRating: progressData.difficulty_rating,
          completionPercentage: progressData.completion_percentage,
          isCompleted: progressData.is_completed,
          lastStudiedAt: progressData.last_studied_at,
        },
      });
    } catch (error) {
      console.error('Update user course progress error:', error);
      res.status(500).json({ message: 'Failed to update course progress' });
    }
  },

  // Get user course progress
  async getUserCourseProgress(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;

      const progress = await courseProgressModel.getCourseProgress(
        userId,
        courseId,
      );

      if (!progress) {
        return res.json({
          message: 'No progress found for this course',
          progress: null,
        });
      }

      res.json({
        progress: {
          courseId: progress.course_id,
          userId: progress.user_id,
          tekrarSayisi: progress.tekrar_sayisi,
          konuKaynaklari: progress.konu_kaynaklari,
          soruBankasiKaynaklari: progress.soru_bankasi_kaynaklari,
          totalStudyTimeSeconds: progress.total_study_time_seconds,
          totalBreakTimeSeconds: progress.total_break_time_seconds,
          totalSessionCount: progress.total_session_count,
          totalStudyTimeMinutes:
            Math.round(((progress.total_study_time_seconds || 0) / 60) * 10) /
            10,
          totalStudyTimeHours:
            Math.round(
              ((progress.total_study_time_seconds || 0) / 3600) * 100,
            ) / 100,
          lastStudiedAt: progress.last_studied_at,
          difficultyRating: progress.difficulty_rating,
          completionPercentage: progress.completion_percentage,
          isCompleted: progress.is_completed,
          notes: progress.notes,
        },
      });
    } catch (error) {
      console.error('Get user course progress error:', error);
      res.status(500).json({ message: 'Failed to retrieve course progress' });
    }
  },

  // Mark course as completed
  async markCourseCompleted(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;

      // Check if course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({
          message: 'Course not found',
        });
      }

      const completedCourse = await courseProgressModel.markCourseCompleted(
        userId,
        courseId,
      );

      res.json({
        message: 'Course marked as completed successfully',
        course: {
          courseId: completedCourse.course_id,
          courseTitle: course.title,
          userId: completedCourse.user_id,
          completedAt: completedCourse.updated_at,
          completionPercentage: completedCourse.completion_percentage,
        },
      });
    } catch (error) {
      console.error('Mark course completed error:', error);
      res.status(500).json({ message: 'Failed to mark course as completed' });
    }
  },

  // ===============================
  // COURSE & USER OVERVIEW
  // ===============================

  // Get all courses
  async getAllCourses(req, res) {
    try {
      const { courseType } = req.query;

      let courses;
      if (courseType) {
        courses = await courseModel.getByType(courseType);
      } else {
        courses = await courseModel.getAll();
      }

      res.json(courses);
    } catch (error) {
      console.error('Get all courses error:', error);
      res.status(500).json({ message: 'Failed to retrieve courses' });
    }
  },

  // Get user study overview for all courses
  async getUserAllCoursesOverview(req, res) {
    try {
      const userId = req.user.userId;

      const overview = await courseProgressModel.getUserProgress(userId);

      // Transform the data
      const transformedOverview = overview.map((course) => ({
        courseId: course.course_id,
        courseTitle: course.course_title,
        courseDescription: course.course_description,
        courseType: course.course_type,
        tekrarSayisi: course.tekrar_sayisi,
        konuKaynaklari: course.konu_kaynaklari,
        soruBankasiKaynaklari: course.soru_bankasi_kaynaklari,
        totalStudyTimeSeconds: course.total_study_time_seconds,
        totalBreakTimeSeconds: course.total_break_time_seconds,
        totalSessionCount: course.total_session_count,
        totalStudyTimeMinutes: course.total_study_time_minutes,
        totalStudyTimeHours: course.total_study_time_hours,
        lastStudiedAt: course.last_studied_at,
        difficultyRating: course.difficulty_rating,
        completionPercentage: course.completion_percentage,
        isCompleted: course.is_completed,
        activeSessionId: course.active_session_id,
        notes: course.course_notes,
      }));

      res.json({
        coursesOverview: transformedOverview,
        totalCourses: transformedOverview.length,
        completedCourses: transformedOverview.filter((c) => c.isCompleted)
          .length,
        coursesInProgress: transformedOverview.filter(
          (c) => c.totalStudyTimeSeconds > 0 && !c.isCompleted,
        ).length,
      });
    } catch (error) {
      console.error('Get user all courses overview error:', error);
      res.status(500).json({ message: 'Failed to retrieve courses overview' });
    }
  },

  // Get overall user study statistics
  async getUserStudyStatistics(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await courseSessionModel.getStudyStats(userId);

      // Get recent study time (last 24 hours)
      const recentStudyTime = await courseSessionModel.getRecentStudyTime(
        userId,
      );

      // Get daily study time (last 7 days)
      const dailyStudyTime = await courseSessionModel.getDailyStudyTime(userId);

      // Get study time by course
      const studyTimeByCourse = await courseSessionModel.getStudyTimeByCourse(
        userId,
      );

      res.json({
        totalSessions: stats.total_sessions,
        totalStudyTimeSeconds: stats.total_study_time,
        totalBreakTimeSeconds: stats.total_break_time,
        totalStudyTimeHours:
          Math.round((stats.total_study_time / 3600) * 100) / 100,
        totalBreakTimeHours:
          Math.round((stats.total_break_time / 3600) * 100) / 100,
        longestSessionSeconds: stats.longest_session,
        longestSessionMinutes:
          Math.round((stats.longest_session / 60) * 10) / 10,
        averageSessionSeconds: stats.average_session,
        averageSessionMinutes:
          Math.round((stats.average_session / 60) * 10) / 10,
        recentStudyTimeSeconds: recentStudyTime,
        recentStudyTimeHours: Math.round((recentStudyTime / 3600) * 100) / 100,
        dailyStudyTime,
        studyTimeByCourse,
      });
    } catch (error) {
      console.error('Get user study statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve study statistics' });
    }
  },

  // ===============================
  // PREFERRED COURSE MANAGEMENT
  // ===============================

  // Set user preferred course
  async setUserPreferredCourse(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.body;

      if (!courseId) {
        return res.status(400).json({
          message: 'Course ID is required',
        });
      }

      // Validate that the course exists
      const course = await courseModel.getById(courseId);
      if (!course) {
        return res.status(404).json({
          message: 'Course not found',
        });
      }

      // Set preferred course
      const result = await courseModel.setUserPreferredCourse(userId, courseId);

      res.json({
        message: 'Preferred course set successfully',
        course: {
          courseId: course.course_id,
          title: course.title,
          courseType: course.course_type,
        },
      });
    } catch (error) {
      console.error('Set user preferred course error:', error);
      res.status(500).json({ message: 'Failed to set preferred course' });
    }
  },

  // Get user preferred course
  async getUserPreferredCourse(req, res) {
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
      console.error('Get user preferred course error:', error);
      res.status(500).json({ message: 'Failed to retrieve preferred course' });
    }
  },
};

module.exports = studyController;
