const db = require('../config/db'); // Keeping this for compatibility with existing functions
// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseKey } = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Study Progress Model
const progressModel = {
  // Update or create study progress
  async updateProgress(userId, subtopicId, repetitionCount, masteryLevel) {
    try {
      // First check if the record exists
      const { data: existingProgress } = await supabase
        .from('user_study_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('subtopic_id', subtopicId)
        .single();

      if (existingProgress) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_study_progress')
          .update({
            repetition_count: repetitionCount,
            mastery_level: masteryLevel,
            last_studied_at: new Date(),
          })
          .eq('user_id', userId)
          .eq('subtopic_id', subtopicId)
          .select('*')
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_study_progress')
          .insert({
            user_id: userId,
            subtopic_id: subtopicId,
            repetition_count: repetitionCount,
            mastery_level: masteryLevel,
            last_studied_at: new Date(),
          })
          .select('*')
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  },

  // Get user's progress for all subtopics
  async getUserProgress(userId) {
    try {
      const { data, error } = await supabase
        .from('user_study_progress')
        .select(
          `
          *,
          subtopics(title, topic_id, subtopics(title, topic_id)),
          topics:subtopics!inner(title, topics(title, course_id)),
          courses:topics.courses(title)
        `,
        )
        .eq('user_id', userId)
        .order('last_studied_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the expected format from the old SQL query
      const formattedData = data.map((progress) => ({
        progress_id: progress.progress_id,
        user_id: progress.user_id,
        subtopic_id: progress.subtopic_id,
        repetition_count: progress.repetition_count,
        mastery_level: progress.mastery_level,
        last_studied_at: progress.last_studied_at,
        subtopic_title: progress.subtopics.title,
        topic_title: progress.topics[0]?.title,
        course_title: progress.courses[0]?.title,
      }));

      return formattedData;
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw error;
    }
  },

  // Get progress for specific subtopic
  async getSubtopicProgress(userId, subtopicId) {
    try {
      const { data, error } = await supabase
        .from('user_study_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('subtopic_id', subtopicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is the "no rows returned" error

      return data || null;
    } catch (error) {
      console.error('Error getting subtopic progress:', error);
      throw error;
    }
  },
};

// Study Session Model
const sessionModel = {
  // Start a new study session
  async startSession(userId) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          start_time: new Date(),
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  },

  // End study session
  async endSession(sessionId) {
    try {
      // Get the session to get the user_id
      const { data: session, error: sessionError } = await supabase
        .from('study_sessions')
        .select('user_id, start_time')
        .eq('session_id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) return null;

      // Calculate duration in seconds
      const startTime = new Date(session.start_time);
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime - startTime) / 1000);

      // Update the session
      const { data, error } = await supabase
        .from('study_sessions')
        .update({
          end_time: endTime,
          duration: durationInSeconds,
        })
        .eq('session_id', sessionId)
        .select('*')
        .single();

      if (error) throw error;

      // Update user's total study time
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          total_study_time: supabase.rpc('increment_study_time', {
            user_id_param: session.user_id,
            duration_param: durationInSeconds,
          }),
        })
        .eq('user_id', session.user_id);

      if (userUpdateError) throw userUpdateError;

      return data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  },

  // Add session detail
  async addSessionDetail(sessionId, subtopicId, duration) {
    try {
      const { data, error } = await supabase
        .from('session_details')
        .insert({
          session_id: sessionId,
          subtopic_id: subtopicId,
          duration: duration,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding session detail:', error);
      throw error;
    }
  },

  // Get user's sessions
  async getUserSessions(userId) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      throw error;
    }
  },

  // Get session details
  async getSessionDetails(sessionId) {
    try {
      const { data, error } = await supabase
        .from('session_details')
        .select(
          `
          *,
          subtopics(title, topic_id),
          topics:subtopics!inner(title, topics(title))
        `,
        )
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform the data to match the expected format
      const formattedData = data.map((detail) => ({
        detail_id: detail.detail_id,
        session_id: detail.session_id,
        subtopic_id: detail.subtopic_id,
        duration: detail.duration,
        created_at: detail.created_at,
        subtopic_title: detail.subtopics.title,
        topic_title: detail.topics[0]?.title,
      }));

      return formattedData;
    } catch (error) {
      console.error('Error getting session details:', error);
      throw error;
    }
  },

  // Get study statistics
  async getStudyStats(userId) {
    try {
      // Get the basic stats from study_sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId)
        .not('end_time', 'is', null);

      if (sessionsError) throw sessionsError;

      // Calculate stats
      const totalSessions = sessions.length;
      const totalDuration = sessions.reduce(
        (sum, session) => sum + (session.duration || 0),
        0,
      );
      const longestSession =
        sessions.length > 0
          ? Math.max(...sessions.map((s) => s.duration || 0))
          : 0;
      const averageSession =
        totalSessions > 0 ? totalDuration / totalSessions : 0;

      return {
        total_sessions: totalSessions,
        total_duration: totalDuration,
        longest_session: longestSession,
        average_session: averageSession,
      };
    } catch (error) {
      console.error('Error getting study stats:', error);
      throw error;
    }
  },

  // Get user's study time in the last 24 hours
  async getRecentStudyTime(userId) {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', userId)
        .gte('start_time', oneDayAgo.toISOString())
        .not('end_time', 'is', null);

      if (error) throw error;

      const totalDuration = data.reduce(
        (sum, session) => sum + (session.duration || 0),
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
        .from('study_sessions')
        .select('start_time, duration')
        .eq('user_id', userId)
        .gte('start_time', sevenDaysAgo.toISOString())
        .not('end_time', 'is', null);

      if (error) throw error;

      // Group by day
      const dailyData = {};
      data.forEach((session) => {
        const date = new Date(session.start_time).toISOString().split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + (session.duration || 0);
      });

      // Convert to array format
      const result = Object.entries(dailyData).map(
        ([study_date, total_duration]) => ({
          study_date,
          total_duration,
        }),
      );

      // Sort by date
      result.sort((a, b) => a.study_date.localeCompare(b.study_date));

      return result;
    } catch (error) {
      console.error('Error getting daily study time:', error);
      throw error;
    }
  },

  // Get study time by topic
  async getStudyTimeByTopic(userId) {
    try {
      // This is a complex query that might need to be broken down into multiple queries
      // First, get all session details for the user's sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('session_id')
        .eq('user_id', userId)
        .not('end_time', 'is', null);

      if (sessionsError) throw sessionsError;

      if (sessions.length === 0) return [];

      const sessionIds = sessions.map((s) => s.session_id);

      // Get all details with their subtopics and topics
      const { data: details, error: detailsError } = await supabase
        .from('session_details')
        .select(
          `
          duration,
          subtopics!inner(
            topic_id,
            topics!inner(
              topic_id,
              title
            )
          )
        `,
        )
        .in('session_id', sessionIds);

      if (detailsError) throw detailsError;

      // Aggregate study time by topic
      const topicDurations = {};
      details.forEach((detail) => {
        const topicId = detail.subtopics.topic_id;
        const topicTitle = detail.subtopics.topics.title;

        if (!topicDurations[topicId]) {
          topicDurations[topicId] = {
            topic_id: topicId,
            topic_title: topicTitle,
            total_duration: 0,
          };
        }

        topicDurations[topicId].total_duration += detail.duration || 0;
      });

      // Convert to array and sort
      const result = Object.values(topicDurations).sort(
        (a, b) => b.total_duration - a.total_duration,
      );

      return result;
    } catch (error) {
      console.error('Error getting study time by topic:', error);
      throw error;
    }
  },
};

// User Error Analytics Model
const errorAnalyticsModel = {
  // Update error analytics
  async updateErrorAnalytics(userId, subtopicId, isError) {
    try {
      // First check if the record exists
      const { data: existingAnalytics } = await supabase
        .from('user_error_analytics')
        .select('*')
        .eq('user_id', userId)
        .eq('subtopic_id', subtopicId)
        .single();

      const errorIncrement = isError ? 1 : 0;

      if (existingAnalytics) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_error_analytics')
          .update({
            error_count: existingAnalytics.error_count + errorIncrement,
            total_attempts: existingAnalytics.total_attempts + 1,
            last_updated_at: new Date(),
          })
          .eq('user_id', userId)
          .eq('subtopic_id', subtopicId)
          .select('*')
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_error_analytics')
          .insert({
            user_id: userId,
            subtopic_id: subtopicId,
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
      console.error('Error updating error analytics:', error);
      throw error;
    }
  },

  // Get user's error analytics
  async getUserErrorAnalytics(userId) {
    try {
      const { data, error } = await supabase
        .from('user_error_analytics')
        .select(
          `
          *,
          subtopics(title, topic_id),
          topics:subtopics!inner(title, topics(title))
        `,
        )
        .eq('user_id', userId);

      if (error) throw error;

      // Transform and add error_percentage
      const formattedData = data.map((analytics) => {
        const errorPercentage =
          analytics.total_attempts > 0
            ? (analytics.error_count / analytics.total_attempts) * 100
            : 0;

        return {
          error_id: analytics.error_id,
          user_id: analytics.user_id,
          subtopic_id: analytics.subtopic_id,
          error_count: analytics.error_count,
          total_attempts: analytics.total_attempts,
          last_updated_at: analytics.last_updated_at,
          subtopic_title: analytics.subtopics.title,
          topic_title: analytics.topics[0]?.title,
          error_percentage: errorPercentage,
        };
      });

      // Sort by error_percentage in descending order
      formattedData.sort((a, b) => b.error_percentage - a.error_percentage);

      return formattedData;
    } catch (error) {
      console.error('Error getting user error analytics:', error);
      throw error;
    }
  },

  // Get user's most problematic topics
  async getMostProblematicTopics(userId, limit = 5) {
    try {
      // First get all user error analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from('user_error_analytics')
        .select(
          `
          error_count,
          total_attempts,
          subtopics!inner(
            topic_id,
            topics!inner(
              topic_id,
              title
            )
          )
        `,
        )
        .eq('user_id', userId);

      if (analyticsError) throw analyticsError;

      // Group by topic
      const topicStats = {};
      analytics.forEach((item) => {
        const topicId = item.subtopics.topics.topic_id;
        const topicTitle = item.subtopics.topics.title;

        if (!topicStats[topicId]) {
          topicStats[topicId] = {
            topic_id: topicId,
            topic_title: topicTitle,
            total_errors: 0,
            total_attempts: 0,
          };
        }

        topicStats[topicId].total_errors += item.error_count;
        topicStats[topicId].total_attempts += item.total_attempts;
      });

      // Calculate error rate and convert to array
      const result = Object.values(topicStats).map((topic) => {
        const errorRate =
          topic.total_attempts > 0
            ? (topic.total_errors / topic.total_attempts) * 100
            : 0;

        return {
          ...topic,
          error_rate: errorRate,
        };
      });

      // Sort by error_rate in descending order
      result.sort((a, b) => {
        if (b.error_rate !== a.error_rate) {
          return b.error_rate - a.error_rate;
        }
        return b.total_errors - a.total_errors;
      });

      // Limit results
      return result.slice(0, limit);
    } catch (error) {
      console.error('Error getting most problematic topics:', error);
      throw error;
    }
  },

  // Get accuracy rate for each topic
  async getTopicAccuracyRates(userId) {
    try {
      // First get all user error analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from('user_error_analytics')
        .select(
          `
          error_count,
          total_attempts,
          subtopics!inner(
            topic_id,
            topics!inner(
              topic_id,
              title
            )
          )
        `,
        )
        .eq('user_id', userId);

      if (analyticsError) throw analyticsError;

      // Group by topic
      const topicStats = {};
      analytics.forEach((item) => {
        const topicId = item.subtopics.topics.topic_id;
        const topicTitle = item.subtopics.topics.title;

        if (!topicStats[topicId]) {
          topicStats[topicId] = {
            topic_id: topicId,
            topic_title: topicTitle,
            correct_answers: 0,
            total_attempts: 0,
          };
        }

        topicStats[topicId].correct_answers +=
          item.total_attempts - item.error_count;
        topicStats[topicId].total_attempts += item.total_attempts;
      });

      // Calculate accuracy rate and convert to array
      const result = Object.values(topicStats).map((topic) => {
        const accuracyRate =
          topic.total_attempts > 0
            ? (topic.correct_answers / topic.total_attempts) * 100
            : 0;

        return {
          ...topic,
          accuracy_rate: accuracyRate,
        };
      });

      // Sort by accuracy_rate in descending order
      result.sort((a, b) => b.accuracy_rate - a.accuracy_rate);

      return result;
    } catch (error) {
      console.error('Error getting topic accuracy rates:', error);
      throw error;
    }
  },
};

module.exports = {
  progressModel,
  sessionModel,
  errorAnalyticsModel,
};
