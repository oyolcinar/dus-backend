const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

const courseModel = {
  // Create a new course
  async create(
    title,
    description,
    imageUrl,
    courseType = 'temel_dersler',
    nicknames = null,
  ) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title,
          description,
          image_url: imageUrl,
          course_type: courseType,
          nicknames,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  },

  // Get all courses
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('course_type', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error retrieving all courses:', error);
      throw error;
    }
  },

  // Get courses by type
  async getByType(courseType) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('course_type', courseType)
        .order('title');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error retrieving courses by type (${courseType}):`, error);
      throw error;
    }
  },

  // Get courses by subscription type
  async getBySubscriptionType(subscriptionType) {
    try {
      // For now, we'll return all courses since subscription filtering
      // may require a more complex query or join
      // This should be implemented based on your subscription model
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('course_type', { ascending: true })
        .order('title');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error retrieving courses by subscription type (${subscriptionType}):`,
        error,
      );
      throw error;
    }
  },

  // Get course by ID
  async getById(courseId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error(`Error retrieving course ID ${courseId}:`, error);
      throw error;
    }
  },

  // Update course
  async update(courseId, title, description, imageUrl, courseType, nicknames) {
    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.image_url = imageUrl;
      if (courseType !== undefined) updateData.course_type = courseType;
      if (nicknames !== undefined) updateData.nicknames = nicknames;

      const { data, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating course ID ${courseId}:`, error);
      throw error;
    }
  },

  // Delete course
  async delete(courseId) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .delete()
        .eq('course_id', courseId)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { course_id: courseId };
    } catch (error) {
      console.error(`Error deleting course ID ${courseId}:`, error);
      throw error;
    }
  },

  // Get user's progress for a course (Updated for course-based system)
  async getUserProgress(userId, courseId) {
    try {
      const { data: courseDetails, error: detailsError } = await supabase
        .from('user_course_study_overview')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (detailsError && detailsError.code !== 'PGRST116') throw detailsError;

      return {
        courseId,
        userId,
        studyTimeSeconds: courseDetails?.total_study_time_seconds || 0,
        breakTimeSeconds: courseDetails?.total_break_time_seconds || 0,
        sessionCount: courseDetails?.total_session_count || 0,
        completionPercentage: courseDetails?.completion_percentage || 0,
        isCompleted: courseDetails?.is_completed || false,
        difficultyRating: courseDetails?.difficulty_rating || null,
        tekrarSayisi: courseDetails?.tekrar_sayisi || 0,
        lastStudiedAt: courseDetails?.last_studied_at || null,
        konuKaynaklari: courseDetails?.konu_kaynaklari || [],
        soruBankasiKaynaklari: courseDetails?.soru_bankasi_kaynaklari || [],
        notes: courseDetails?.course_notes || null,
        activeSessionId: courseDetails?.active_session_id || null,
      };
    } catch (error) {
      console.error(
        `Error getting user progress for course ${courseId}, user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Get all user's course progress
  async getAllUserProgress(userId) {
    try {
      const { data, error } = await supabase
        .from('user_course_study_overview')
        .select('*')
        .eq('user_id', userId)
        .order('last_studied_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((course) => ({
        courseId: course.course_id,
        courseTitle: course.course_title,
        courseDescription: course.course_description,
        courseType: course.course_type,
        studyTimeSeconds: course.total_study_time_seconds || 0,
        breakTimeSeconds: course.total_break_time_seconds || 0,
        sessionCount: course.total_session_count || 0,
        completionPercentage: course.completion_percentage || 0,
        isCompleted: course.is_completed || false,
        difficultyRating: course.difficulty_rating || null,
        tekrarSayisi: course.tekrar_sayisi || 0,
        lastStudiedAt: course.last_studied_at || null,
        activeSessionId: course.active_session_id || null,
      }));
    } catch (error) {
      console.error(
        `Error getting all user progress for user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Start studying a course
  async startStudying(userId, courseId, notes = null) {
    try {
      // This will be handled by the course session model
      const { courseSessionModel } = require('./studyModels');
      return await courseSessionModel.startSession(userId, courseId, notes);
    } catch (error) {
      console.error(
        `Error starting study session for course ${courseId}:`,
        error,
      );
      throw error;
    }
  },

  // Update course progress
  async updateCourseProgress(userId, courseId, progressData) {
    try {
      const updateData = {
        updated_at: new Date(),
      };

      if (progressData.tekrarSayisi !== undefined) {
        updateData.tekrar_sayisi = progressData.tekrarSayisi;
      }
      if (progressData.difficultyRating !== undefined) {
        updateData.difficulty_rating = progressData.difficultyRating;
      }
      if (progressData.completionPercentage !== undefined) {
        updateData.completion_percentage = progressData.completionPercentage;
      }
      if (progressData.isCompleted !== undefined) {
        updateData.is_completed = progressData.isCompleted;
      }
      if (progressData.konuKaynaklari !== undefined) {
        updateData.konu_kaynaklari = progressData.konuKaynaklari;
      }
      if (progressData.soruBankasiKaynaklari !== undefined) {
        updateData.soru_bankasi_kaynaklari = progressData.soruBankasiKaynaklari;
      }
      if (progressData.notes !== undefined) {
        updateData.notes = progressData.notes;
      }

      const { data, error } = await supabase
        .from('user_course_details')
        .upsert({
          user_id: userId,
          course_id: courseId,
          ...updateData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error updating course progress for course ${courseId}, user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Mark course as completed
  async markCourseCompleted(userId, courseId) {
    try {
      const { data, error } = await supabase
        .from('user_course_details')
        .upsert({
          user_id: userId,
          course_id: courseId,
          is_completed: true,
          completion_percentage: 100.0,
          updated_at: new Date(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        userId,
        courseId,
        isCompleted: true,
        completionPercentage: 100.0,
        completedAt: data.updated_at,
      };
    } catch (error) {
      console.error(
        `Error marking course ${courseId} as completed for user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Get course statistics
  async getCourseStats(courseId) {
    try {
      // Get basic course stats
      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (!course) throw new Error(`Course ${courseId} not found`);

      // Get total users who studied this course
      const { data: studyingUsers, error: usersError } = await supabase
        .from('user_course_details')
        .select('user_id')
        .eq('course_id', courseId)
        .gt('total_study_time_seconds', 0);

      if (usersError) throw usersError;

      // Get total users who completed this course
      const { data: completedUsers, error: completedError } = await supabase
        .from('user_course_details')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('is_completed', true);

      if (completedError) throw completedError;

      // Get total study time for this course
      const { data: studyStats, error: statsError } = await supabase
        .from('user_course_details')
        .select('total_study_time_seconds, total_session_count')
        .eq('course_id', courseId);

      if (statsError) throw statsError;

      const totalStudyTime = (studyStats || []).reduce(
        (sum, stat) => sum + (stat.total_study_time_seconds || 0),
        0,
      );
      const totalSessions = (studyStats || []).reduce(
        (sum, stat) => sum + (stat.total_session_count || 0),
        0,
      );

      // Get total tests for this course (if applicable)
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('test_id')
        .eq('course_id', courseId);

      if (testsError) throw testsError;

      // Get total questions for this course
      const testIds = (tests || []).map((t) => t.test_id);
      let totalQuestions = 0;

      if (testIds.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from('test_questions')
          .select('question_id')
          .in('test_id', testIds);

        if (questionsError) throw questionsError;
        totalQuestions = (questions || []).length;
      }

      return {
        courseId,
        courseTitle: course.title,
        courseType: course.course_type,
        totalUsers: (studyingUsers || []).length,
        totalCompletedUsers: (completedUsers || []).length,
        totalStudyTimeSeconds: totalStudyTime,
        totalSessions: totalSessions,
        totalTests: (tests || []).length,
        totalQuestions,
        averageStudyTimePerUser:
          studyingUsers?.length > 0 ? totalStudyTime / studyingUsers.length : 0,
        completionRate:
          studyingUsers?.length > 0
            ? (completedUsers?.length / studyingUsers.length) * 100
            : 0,
      };
    } catch (error) {
      console.error(
        `Error getting course statistics for course ${courseId}:`,
        error,
      );
      throw error;
    }
  },

  // Get user's course study sessions
  async getUserCourseSessions(userId, courseId, limit = 50) {
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
      console.error(
        `Error getting user course sessions for course ${courseId}, user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Get courses with user progress
  async getCoursesWithProgress(userId) {
    try {
      const { data, error } = await supabase
        .from('user_all_courses_statistics')
        .select('*')
        .eq('user_id', userId)
        .order('last_studied_in_course', { ascending: false, nullsLast: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(
        `Error getting courses with progress for user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Get user's favorite/preferred courses
  async getUserPreferredCourse(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('preferred_course_id')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (user?.preferred_course_id) {
        return await this.getById(user.preferred_course_id);
      }

      return null;
    } catch (error) {
      console.error(
        `Error getting preferred course for user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Set user's preferred course
  async setUserPreferredCourse(userId, courseId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ preferred_course_id: courseId })
        .eq('user_id', userId)
        .select('preferred_course_id')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(
        `Error setting preferred course for user ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Get trending courses (most studied recently)
  async getTrendingCourses(limit = 10) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('user_course_study_sessions')
        .select(
          `
          course_id,
          courses!inner(title, description, image_url, course_type)
        `,
        )
        .gte('start_time', sevenDaysAgo.toISOString())
        .eq('session_status', 'completed');

      if (error) throw error;

      // Count sessions per course
      const courseCounts = {};
      (data || []).forEach((session) => {
        const courseId = session.course_id;
        if (!courseCounts[courseId]) {
          courseCounts[courseId] = {
            course_id: courseId,
            title: session.courses.title,
            description: session.courses.description,
            image_url: session.courses.image_url,
            course_type: session.courses.course_type,
            session_count: 0,
          };
        }
        courseCounts[courseId].session_count++;
      });

      // Sort by session count and limit
      const trending = Object.values(courseCounts)
        .sort((a, b) => b.session_count - a.session_count)
        .slice(0, limit);

      return trending;
    } catch (error) {
      console.error('Error getting trending courses:', error);
      throw error;
    }
  },
};

module.exports = courseModel;
