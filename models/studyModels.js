const db = require('../config/db'); // Keeping this for compatibility with existing functions
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Course Progress Model (replaces topic-based progress)
const courseProgressModel = {
  // Update or create course study progress
  async updateProgress(
    userId,
    courseId,
    tekrarSayisi,
    difficultyRating,
    completionPercentage,
  ) {
    try {
      // First check if the record exists
      const { data: existingProgress } = await supabase
        .from('user_course_details')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (existingProgress) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_course_details')
          .update({
            tekrar_sayisi: tekrarSayisi,
            difficulty_rating: difficultyRating,
            completion_percentage: completionPercentage,
            last_studied_at: new Date(),
            updated_at: new Date(),
          })
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .select('*')
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_course_details')
          .insert({
            user_id: userId,
            course_id: courseId,
            tekrar_sayisi: tekrarSayisi,
            difficulty_rating: difficultyRating,
            completion_percentage: completionPercentage,
            last_studied_at: new Date(),
          })
          .select('*')
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating course progress:', error);
      throw error;
    }
  },

  // Get user's progress for all courses
  async getUserProgress(userId) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_overview')
        .select('*')
        .eq('user_id', userId)
        .order('last_studied_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user course progress:', error);
      throw error;
    }
  },

  // Get progress for specific course
  async getCourseProgress(userId, courseId) {
    try {
      const { data, error } = await supabase
        .from('user_course_details')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is the "no rows returned" error

      return data || null;
    } catch (error) {
      console.error('Error getting course progress:', error);
      throw error;
    }
  },

  // Mark course as completed
  async markCourseCompleted(userId, courseId) {
    try {
      const { data, error } = await supabase
        .from('user_course_details')
        .update({
          is_completed: true,
          completion_percentage: 100.0,
          updated_at: new Date(),
        })
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking course as completed:', error);
      throw error;
    }
  },

  // Update course sources
  async updateCourseSources(userId, courseId, konuKaynaklari, soruBankasi) {
    try {
      const { data, error } = await supabase
        .from('user_course_details')
        .update({
          konu_kaynaklari: konuKaynaklari,
          soru_bankasi_kaynaklari: soruBankasi,
          updated_at: new Date(),
        })
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating course sources:', error);
      throw error;
    }
  },
};

// Course Study Session Model (replaces topic-based sessions)
const courseSessionModel = {
  // Start a new course study session
  async startSession(userId, courseId, notes = null) {
    try {
      // End any active sessions for this user first
      await this.endActiveUserSessions(userId);

      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .insert({
          user_id: userId,
          course_id: courseId,
          notes: notes,
          session_status: 'active',
        })
        .select('*')
        .single();

      if (error) throw error;

      // Initialize user course details if not exists
      await this.initializeCourseDetails(userId, courseId);

      return data;
    } catch (error) {
      console.error('Error starting course session:', error);
      throw error;
    }
  },

  // End study session
  async endSession(sessionId) {
    try {
      // Get the session details
      const { data: session, error: sessionError } = await supabase
        .from('user_course_study_sessions')
        .select('user_id, course_id, start_time, break_duration_seconds')
        .eq('session_id', sessionId)
        .eq('session_status', 'active')
        .single();

      if (sessionError) throw sessionError;
      if (!session) return null;

      // Calculate durations
      const startTime = new Date(session.start_time);
      const endTime = new Date();
      const totalDurationSeconds = Math.floor((endTime - startTime) / 1000);
      const breakDurationSeconds = session.break_duration_seconds || 0;
      const studyDurationSeconds = Math.max(
        0,
        totalDurationSeconds - breakDurationSeconds,
      );

      // Update the session
      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .update({
          end_time: endTime,
          study_duration_seconds: studyDurationSeconds,
          total_duration_seconds: totalDurationSeconds,
          session_status: 'completed',
          updated_at: endTime,
        })
        .eq('session_id', sessionId)
        .select('*')
        .single();

      if (error) throw error;

      // Update user course details
      await this.updateCourseDetailsAfterSession(
        session.user_id,
        session.course_id,
        studyDurationSeconds,
        breakDurationSeconds,
      );

      return data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  },

  // Add break time to active session
  async addBreakTime(sessionId, breakDurationSeconds) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .update({
          break_duration_seconds: supabase.sql`COALESCE(break_duration_seconds, 0) + ${breakDurationSeconds}`,
          updated_at: new Date(),
        })
        .eq('session_id', sessionId)
        .eq('session_status', 'active')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding break time:', error);
      throw error;
    }
  },

  // Get user's active session
  async getActiveSession(userId) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          `
          *,
          courses(title, description)
        `,
        )
        .eq('user_id', userId)
        .eq('session_status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting active session:', error);
      throw error;
    }
  },

  // Get user's sessions
  async getUserSessions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          `
          *,
          courses(title, description)
        `,
        )
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  },

  // Get course sessions
  async getCourseSessions(userId, courseId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting course sessions:', error);
      throw error;
    }
  },

  // Get study statistics
  async getStudyStats(userId) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          'study_duration_seconds, break_duration_seconds, total_duration_seconds',
        )
        .eq('user_id', userId)
        .eq('session_status', 'completed');

      if (error) throw error;

      const sessions = data || [];
      const totalSessions = sessions.length;
      const totalStudyTime = sessions.reduce(
        (sum, s) => sum + (s.study_duration_seconds || 0),
        0,
      );
      const totalBreakTime = sessions.reduce(
        (sum, s) => sum + (s.break_duration_seconds || 0),
        0,
      );
      const longestSession =
        sessions.length > 0
          ? Math.max(...sessions.map((s) => s.study_duration_seconds || 0))
          : 0;
      const averageSession =
        totalSessions > 0 ? totalStudyTime / totalSessions : 0;

      return {
        total_sessions: totalSessions,
        total_study_time: totalStudyTime,
        total_break_time: totalBreakTime,
        longest_session: longestSession,
        average_session: averageSession,
      };
    } catch (error) {
      console.error('Error getting study stats:', error);
      throw error;
    }
  },

  // Get recent study time (last 24 hours)
  async getRecentStudyTime(userId) {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select('study_duration_seconds')
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .gte('start_time', oneDayAgo.toISOString());

      if (error) throw error;

      const totalDuration = (data || []).reduce(
        (sum, session) => sum + (session.study_duration_seconds || 0),
        0,
      );
      return totalDuration;
    } catch (error) {
      console.error('Error getting recent study time:', error);
      throw error;
    }
  },

  // Get daily study time over last 7 days
  async getDailyStudyTime(userId) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select('session_date, study_duration_seconds')
        .eq('user_id', userId)
        .eq('session_status', 'completed')
        .gte('start_time', sevenDaysAgo.toISOString());

      if (error) throw error;

      // Group by day
      const dailyData = {};
      (data || []).forEach((session) => {
        const date = session.session_date;
        dailyData[date] =
          (dailyData[date] || 0) + (session.study_duration_seconds || 0);
      });

      // Convert to array format
      const result = Object.entries(dailyData).map(
        ([study_date, total_duration]) => ({
          study_date,
          total_duration,
        }),
      );

      result.sort((a, b) => a.study_date.localeCompare(b.study_date));
      return result;
    } catch (error) {
      console.error('Error getting daily study time:', error);
      throw error;
    }
  },

  // Get study time by course
  async getStudyTimeByCourse(userId) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          `
          study_duration_seconds,
          courses!inner(course_id, title)
        `,
        )
        .eq('user_id', userId)
        .eq('session_status', 'completed');

      if (error) throw error;

      // Aggregate study time by course
      const courseDurations = {};
      (data || []).forEach((session) => {
        const courseId = session.courses.course_id;
        const courseTitle = session.courses.title;

        if (!courseDurations[courseId]) {
          courseDurations[courseId] = {
            course_id: courseId,
            course_title: courseTitle,
            total_duration: 0,
          };
        }

        courseDurations[courseId].total_duration +=
          session.study_duration_seconds || 0;
      });

      const result = Object.values(courseDurations).sort(
        (a, b) => b.total_duration - a.total_duration,
      );

      return result;
    } catch (error) {
      console.error('Error getting study time by course:', error);
      throw error;
    }
  },

  // Helper: End all active sessions for a user
  async endActiveUserSessions(userId) {
    try {
      const { data: activeSessions, error: fetchError } = await supabase
        .from('user_course_study_sessions')
        .select('session_id')
        .eq('user_id', userId)
        .eq('session_status', 'active');

      if (fetchError) throw fetchError;

      if (activeSessions && activeSessions.length > 0) {
        for (const session of activeSessions) {
          await this.endSession(session.session_id);
        }
      }
    } catch (error) {
      console.error('Error ending active user sessions:', error);
      throw error;
    }
  },

  // Helper: Initialize course details if not exists
  async initializeCourseDetails(userId, courseId) {
    try {
      const { error } = await supabase
        .from('user_course_details')
        .insert({
          user_id: userId,
          course_id: courseId,
        })
        .select('*')
        .single();

      // Ignore conflict errors (record already exists)
      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }
    } catch (error) {
      console.error('Error initializing course details:', error);
      throw error;
    }
  },

  // Helper: Update course details after session
  async updateCourseDetailsAfterSession(
    userId,
    courseId,
    studyDurationSeconds,
    breakDurationSeconds,
  ) {
    try {
      const { error } = await supabase
        .from('user_course_details')
        .update({
          total_study_time_seconds: supabase.sql`total_study_time_seconds + ${studyDurationSeconds}`,
          total_break_time_seconds: supabase.sql`total_break_time_seconds + ${breakDurationSeconds}`,
          total_session_count: supabase.sql`total_session_count + 1`,
          last_studied_at: new Date(),
          updated_at: new Date(),
        })
        .eq('user_id', userId)
        .eq('course_id', courseId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating course details after session:', error);
      throw error;
    }
  },
};

// Course Error Analytics Model (adapted for course-level tracking)
const courseErrorAnalyticsModel = {
  // Update error analytics for a course
  async updateErrorAnalytics(userId, courseId, isError) {
    try {
      // This could be implemented if you want course-level error tracking
      // For now, we'll track errors at the course level instead of subtopic level

      const { data: existingAnalytics } = await supabase
        .from('user_course_error_analytics') // New table would need to be created
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      const errorIncrement = isError ? 1 : 0;

      if (existingAnalytics) {
        const { data, error } = await supabase
          .from('user_course_error_analytics')
          .update({
            error_count: existingAnalytics.error_count + errorIncrement,
            total_attempts: existingAnalytics.total_attempts + 1,
            last_updated_at: new Date(),
          })
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .select('*')
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_course_error_analytics')
          .insert({
            user_id: userId,
            course_id: courseId,
            error_count: errorIncrement,
            total_attempts: 1,
            last_updated_at: new Date(),
          })
          .select('*')
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating course error analytics:', error);
      throw error;
    }
  },

  // Get user's error analytics by course
  async getUserErrorAnalytics(userId) {
    try {
      const { data, error } = await supabase
        .from('user_course_error_analytics')
        .select(
          `
          *,
          courses(title, description)
        `,
        )
        .eq('user_id', userId);

      if (error) throw error;

      const formattedData = (data || []).map((analytics) => {
        const errorPercentage =
          analytics.total_attempts > 0
            ? (analytics.error_count / analytics.total_attempts) * 100
            : 0;

        return {
          error_id: analytics.error_id,
          user_id: analytics.user_id,
          course_id: analytics.course_id,
          error_count: analytics.error_count,
          total_attempts: analytics.total_attempts,
          last_updated_at: analytics.last_updated_at,
          course_title: analytics.courses?.title,
          error_percentage: errorPercentage,
        };
      });

      formattedData.sort((a, b) => b.error_percentage - a.error_percentage);
      return formattedData;
    } catch (error) {
      console.error('Error getting user course error analytics:', error);
      throw error;
    }
  },
};

module.exports = {
  courseProgressModel,
  courseSessionModel,
  courseErrorAnalyticsModel,
  // Keep old exports for backward compatibility during migration
  progressModel: courseProgressModel,
  sessionModel: courseSessionModel,
  errorAnalyticsModel: courseErrorAnalyticsModel,
};
