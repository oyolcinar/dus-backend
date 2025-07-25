const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const studyController = {
  // ===============================
  // CHRONOMETER FUNCTIONS
  // ===============================

  // Start a study session for a topic
  async startStudySession(req, res) {
    try {
      const userId = req.user.userId;
      const { topicId, notes } = req.body;

      // Validate input
      if (!topicId) {
        return res.status(400).json({
          message: 'Topic ID is required',
        });
      }

      // Check if topic exists and is from klinik_dersler course
      const { data: topic } = await supabase
        .from('topics')
        .select(
          `
          topic_id,
          title,
          courses!inner (
            course_id,
            title,
            course_type
          )
        `,
        )
        .eq('topic_id', topicId)
        .eq('courses.course_type', 'klinik_dersler')
        .single();

      if (!topic) {
        return res.status(404).json({
          message: 'Topic not found or not from klinik_dersler course',
        });
      }

      // Check for active session for this topic
      const { data: activeSession } = await supabase.rpc(
        'get_active_study_session',
        {
          p_user_id: userId,
          p_topic_id: topicId,
        },
      );

      if (activeSession && activeSession.session_id) {
        return res.status(400).json({
          message: 'An active study session already exists for this topic',
          activeSession,
        });
      }

      // Start new session
      const { data: sessionId, error } = await supabase.rpc(
        'start_study_session',
        {
          p_user_id: userId,
          p_topic_id: topicId,
          p_notes: notes || null,
        },
      );

      if (error) throw error;

      res.status(201).json({
        message: 'Study session started successfully',
        sessionId,
        topic: {
          topicId: topic.topic_id,
          title: topic.title,
          course: topic.courses.title,
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
      const { endNotes } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          message: 'Session ID is required',
        });
      }

      // End session
      const { data: success, error } = await supabase.rpc('end_study_session', {
        p_session_id: parseInt(sessionId),
        p_end_notes: endNotes || null,
      });

      if (error) throw error;

      if (!success) {
        return res.status(404).json({
          message: 'Session not found or already ended',
        });
      }

      // Get updated session details
      const { data: session } = await supabase
        .from('user_topic_study_sessions')
        .select(
          `
          session_id,
          start_time,
          end_time,
          duration_seconds,
          notes,
          topics (
            topic_id,
            title,
            courses (
              title
            )
          )
        `,
        )
        .eq('session_id', sessionId)
        .single();

      res.json({
        message: 'Study session ended successfully',
        session,
      });
    } catch (error) {
      console.error('End study session error:', error);
      res.status(500).json({ message: 'Failed to end study session' });
    }
  },

  // Get active study session for a topic
  async getActiveStudySession(req, res) {
    try {
      const userId = req.user.userId;
      const { topicId } = req.params;

      const { data: activeSession, error } = await supabase.rpc(
        'get_active_study_session',
        {
          p_user_id: userId,
          p_topic_id: parseInt(topicId),
        },
      );

      if (error) throw error;

      res.json(activeSession);
    } catch (error) {
      console.error('Get active study session error:', error);
      res.status(500).json({ message: 'Failed to get active study session' });
    }
  },

  // Get user's study sessions with pagination
  async getUserStudySessions(req, res) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 20, topicId, courseId } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('user_topic_study_sessions')
        .select(
          `
          session_id,
          start_time,
          end_time,
          duration_seconds,
          session_date,
          notes,
          topics (
            topic_id,
            title,
            courses (
              course_id,
              title
            )
          )
        `,
        )
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (topicId) {
        query = query.eq('topic_id', topicId);
      }

      if (courseId) {
        query = query.eq('topics.courses.course_id', courseId);
      }

      const { data: sessions, error } = await query;

      if (error) throw error;

      res.json({
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: sessions?.length || 0,
        },
      });
    } catch (error) {
      console.error('Get user study sessions error:', error);
      res.status(500).json({ message: 'Failed to retrieve study sessions' });
    }
  },

  // ===============================
  // TOPIC DETAILS MANAGEMENT
  // ===============================

  // Update user topic details
  async updateUserTopicDetails(req, res) {
    try {
      const userId = req.user.userId;
      const {
        topicId,
        tekrarSayisi,
        konuKaynaklari,
        soruBankasiKaynaklari,
        difficultyRating,
        notes,
        isCompleted,
      } = req.body;

      // Validate input
      if (!topicId) {
        return res.status(400).json({
          message: 'Topic ID is required',
        });
      }

      // Check if topic exists and is from klinik_dersler course
      const { data: topic } = await supabase
        .from('topics')
        .select(
          `
          topic_id,
          courses!inner (
            course_type
          )
        `,
        )
        .eq('topic_id', topicId)
        .eq('courses.course_type', 'klinik_dersler')
        .single();

      if (!topic) {
        return res.status(404).json({
          message: 'Topic not found or not from klinik_dersler course',
        });
      }

      // Update user topic details
      const { data, error } = await supabase.rpc('update_user_topic_details', {
        p_user_id: userId,
        p_topic_id: topicId,
        p_tekrar_sayisi: tekrarSayisi || null,
        p_konu_kaynaklari: konuKaynaklari || null,
        p_soru_bankasi_kaynaklari: soruBankasiKaynaklari || null,
        p_difficulty_rating: difficultyRating || null,
        p_notes: notes || null,
        p_is_completed: isCompleted || null,
      });

      if (error) throw error;

      res.json({
        message: 'Topic details updated successfully',
        data,
      });
    } catch (error) {
      console.error('Update user topic details error:', error);
      res.status(500).json({ message: 'Failed to update topic details' });
    }
  },

  // Get user topic details
  async getUserTopicDetails(req, res) {
    try {
      const userId = req.user.userId;
      const { topicId } = req.params;

      const { data: details, error } = await supabase
        .from('user_topic_details')
        .select(
          `
          *,
          topics (
            topic_id,
            title,
            description,
            courses (
              course_id,
              title
            )
          )
        `,
        )
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      res.json(details || { message: 'No details found for this topic' });
    } catch (error) {
      console.error('Get user topic details error:', error);
      res.status(500).json({ message: 'Failed to retrieve topic details' });
    }
  },

  // ===============================
  // COURSE & TOPIC OVERVIEW
  // ===============================

  // Get all klinik courses
  async getKlinikCourses(req, res) {
    try {
      const { data: courses, error } = await supabase
        .from('klinik_courses')
        .select('*')
        .order('title');

      if (error) throw error;

      res.json(courses);
    } catch (error) {
      console.error('Get klinik courses error:', error);
      res.status(500).json({ message: 'Failed to retrieve courses' });
    }
  },

  // Get user study overview for a specific course
  async getUserCourseStudyOverview(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId } = req.params;

      const { data: overview, error } = await supabase
        .from('user_topic_study_overview')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('topic_title');

      if (error) throw error;

      res.json(overview || []);
    } catch (error) {
      console.error('Get user course study overview error:', error);
      res
        .status(500)
        .json({ message: 'Failed to retrieve course study overview' });
    }
  },

  // Get user statistics across all courses
  async getUserAllCoursesStatistics(req, res) {
    try {
      const userId = req.user.userId;

      const { data: statistics, error } = await supabase
        .from('user_all_courses_statistics')
        .select('*')
        .eq('user_id', userId)
        .order('course_title');

      if (error) throw error;

      res.json(statistics || []);
    } catch (error) {
      console.error('Get user all courses statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve course statistics' });
    }
  },

  // Get overall user study statistics
  async getUserStudyStatistics(req, res) {
    try {
      const userId = req.user.userId;

      const { data: statistics, error } = await supabase
        .from('user_study_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      res.json(statistics || {});
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

      // Validate that the course is a klinik_dersler course
      const { data: course } = await supabase
        .from('courses')
        .select('course_id, title, course_type')
        .eq('course_id', courseId)
        .eq('course_type', 'klinik_dersler')
        .single();

      if (!course) {
        return res.status(404).json({
          message: 'Course not found or not a klinik_dersler course',
        });
      }

      // Set preferred course
      const { data, error } = await supabase.rpc('set_user_preferred_course', {
        p_user_id: userId,
        p_course_id: courseId,
      });

      if (error) throw error;

      res.json({
        message: 'Preferred course set successfully',
        course: {
          courseId: course.course_id,
          title: course.title,
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

      const { data: user, error } = await supabase
        .from('users')
        .select(
          `
          preferred_course_id,
          courses (
            course_id,
            title,
            description
          )
        `,
        )
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      res.json({
        preferredCourse: user.courses || null,
      });
    } catch (error) {
      console.error('Get user preferred course error:', error);
      res.status(500).json({ message: 'Failed to retrieve preferred course' });
    }
  },
};

module.exports = studyController;
