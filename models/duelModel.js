const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
const notificationService = require('../services/notificationService');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const duelModel = {
  // Create a new duel challenge
  async create(
    initiatorId,
    opponentId,
    testId = null, // Made optional for backward compatibility
    questionCount = 5, // Increased default to 5
    branchType = 'mixed',
    selectionType = 'random',
    branchId = null,
    courseId = null, // NEW: Add courseId parameter
  ) {
    try {
      console.log('🔧 DuelModel.create called with:', {
        initiatorId,
        opponentId,
        testId,
        questionCount,
        branchType,
        selectionType,
        branchId,
        courseId,
      });

      // If courseId is provided but testId is not, we'll use course-based question selection
      const insertData = {
        initiator_id: initiatorId,
        opponent_id: opponentId,
        status: 'pending',
        question_count: questionCount,
        branch_type: branchType,
        selection_type: selectionType,
        branch_id: branchId,
      };

      // Add test_id if provided (backward compatibility)
      if (testId) {
        insertData.test_id = testId;
      }

      // Add course_id if provided (new system)
      if (courseId) {
        insertData.course_id = courseId;
      }

      const { data, error } = await supabase
        .from('duels')
        .insert(insertData)
        .select(
          'duel_id, initiator_id, opponent_id, test_id, course_id, status, start_time, end_time, created_at, question_count, branch_type, selection_type, branch_id',
        )
        .single();

      if (error) {
        console.error('❌ Error creating duel:', error);
        throw error;
      }

      console.log('✅ Duel created successfully:', {
        duelId: data.duel_id,
        courseId: data.course_id,
        testId: data.test_id,
        status: data.status,
      });

      return data;
    } catch (error) {
      console.error('💥 Error in duelModel.create:', error);
      throw error;
    }
  },

  // Get duel by ID
  async getById(duelId) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .select(
          `
        *,
        initiator:users!duels_initiator_id_fkey(username),
        opponent:users!duels_opponent_id_fkey(username),
        test:tests(title),
        course:courses(title)
      `,
        )
        .eq('duel_id', duelId)
        .single();

      if (error) throw error;

      console.log('🔧 DuelModel.getById raw data:', {
        duelId: data.duel_id,
        courseId: data.course_id,
        testId: data.test_id,
        courseTitle: data.course?.title,
      });

      // Transform the response to match the original format
      return {
        duel_id: data.duel_id,
        initiator_id: data.initiator_id,
        opponent_id: data.opponent_id,
        test_id: data.test_id,
        course_id: data.course_id,
        status: data.status,
        start_time: data.start_time,
        end_time: data.end_time,
        created_at: data.created_at,
        question_count: data.question_count,
        branch_type: data.branch_type,
        selection_type: data.selection_type,
        branch_id: data.branch_id,
        initiator_username: data.initiator?.username,
        opponent_username: data.opponent?.username,
        test_title: data.test?.title,
        course_title: data.course?.title,
      };
    } catch (error) {
      console.error('Error getting duel by ID:', error);
      throw error;
    }
  },

  // Get pending duels for a user
  async getPendingByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .select(
          `
          *,
          initiator:users!duels_initiator_id_fkey(username),
          opponent:users!duels_opponent_id_fkey(username),
          test:tests(title),
          course:courses(title)
        `,
        )
        .eq('opponent_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the response to match the original format
      return data.map((duel) => ({
        duel_id: duel.duel_id,
        initiator_id: duel.initiator_id,
        opponent_id: duel.opponent_id,
        test_id: duel.test_id,
        course_id: duel.course_id,
        status: duel.status,
        created_at: duel.created_at,
        question_count: duel.question_count,
        branch_type: duel.branch_type,
        selection_type: duel.selection_type,
        branch_id: duel.branch_id,
        initiator_username: duel.initiator?.username,
        opponent_username: duel.opponent?.username,
        test_title: duel.test?.title,
        course_title: duel.course?.title,
      }));
    } catch (error) {
      console.error('Error getting pending duels:', error);
      throw error;
    }
  },

  // Get active duels for a user
  async getActiveByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .select(
          `
          *,
          initiator:users!duels_initiator_id_fkey(username),
          opponent:users!duels_opponent_id_fkey(username),
          test:tests(title),
          course:courses(title)
        `,
        )
        .or(`initiator_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'active')
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Transform the response to match the original format
      return data.map((duel) => ({
        duel_id: duel.duel_id,
        initiator_id: duel.initiator_id,
        opponent_id: duel.opponent_id,
        test_id: duel.test_id,
        course_id: duel.course_id,
        status: duel.status,
        start_time: duel.start_time,
        created_at: duel.created_at,
        question_count: duel.question_count,
        branch_type: duel.branch_type,
        selection_type: duel.selection_type,
        branch_id: duel.branch_id,
        initiator_username: duel.initiator?.username,
        opponent_username: duel.opponent?.username,
        test_title: duel.test?.title,
        course_title: duel.course?.title,
      }));
    } catch (error) {
      console.error('Error getting active duels:', error);
      throw error;
    }
  },

  // Get completed duels for a user
  async getCompletedByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .select(
          `
          *,
          initiator:users!duels_initiator_id_fkey(username),
          opponent:users!duels_opponent_id_fkey(username),
          test:tests(title),
          course:courses(title),
          duel_results(winner_id, initiator_score, opponent_score)
        `,
        )
        .or(`initiator_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'completed')
        .order('end_time', { ascending: false });

      if (error) throw error;

      // Transform the response to match the original format
      return data.map((duel) => {
        const duelResult = duel.duel_results?.[0] || {};
        const isWinner = duelResult.winner_id === userId;

        return {
          duel_id: duel.duel_id,
          initiator_id: duel.initiator_id,
          opponent_id: duel.opponent_id,
          test_id: duel.test_id,
          course_id: duel.course_id,
          status: duel.status,
          start_time: duel.start_time,
          end_time: duel.end_time,
          created_at: duel.created_at,
          question_count: duel.question_count,
          branch_type: duel.branch_type,
          selection_type: duel.selection_type,
          branch_id: duel.branch_id,
          initiator_username: duel.initiator?.username,
          opponent_username: duel.opponent?.username,
          test_title: duel.test?.title,
          course_title: duel.course?.title,
          winner_id: duelResult.winner_id,
          initiator_score: duelResult.initiator_score,
          opponent_score: duelResult.opponent_score,
          is_winner: isWinner,
        };
      });
    } catch (error) {
      console.error('Error getting completed duels:', error);
      throw error;
    }
  },

  // Accept a duel challenge
  async accept(duelId) {
    try {
      console.log('🔧 DuelModel.accept called for duel:', duelId);

      const { data, error } = await supabase
        .from('duels')
        .update({
          status: 'active',
          start_time: new Date(),
        })
        .eq('duel_id', duelId)
        .eq('status', 'pending')
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error accepting duel:', error);
        throw error;
      }

      console.log('✅ Duel accepted successfully:', {
        duelId: data.duel_id,
        courseId: data.course_id,
        testId: data.test_id,
        status: data.status,
      });

      return data;
    } catch (error) {
      console.error('💥 Error in duelModel.accept:', error);
      throw error;
    }
  },

  // Decline a duel challenge
  async decline(duelId) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .delete()
        .eq('duel_id', duelId)
        .eq('status', 'pending')
        .select('duel_id')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error declining duel:', error);
      throw error;
    }
  },

  // Complete a duel
  async complete(duelId) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .update({
          status: 'completed',
          end_time: new Date(),
        })
        .eq('duel_id', duelId)
        .eq('status', 'active')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error completing duel:', error);
      throw error;
    }
  },

  // Get duels by branch/topic ID
  async getByBranchId(branchId) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .select(
          `
          *,
          initiator:users!duels_initiator_id_fkey(username),
          opponent:users!duels_opponent_id_fkey(username),
          test:tests(title),
          course:courses(title)
        `,
        )
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((duel) => ({
        duel_id: duel.duel_id,
        initiator_id: duel.initiator_id,
        opponent_id: duel.opponent_id,
        test_id: duel.test_id,
        course_id: duel.course_id,
        status: duel.status,
        start_time: duel.start_time,
        end_time: duel.end_time,
        created_at: duel.created_at,
        question_count: duel.question_count,
        branch_type: duel.branch_type,
        selection_type: duel.selection_type,
        branch_id: duel.branch_id,
        initiator_username: duel.initiator?.username,
        opponent_username: duel.opponent?.username,
        test_title: duel.test?.title,
        course_title: duel.course?.title,
      }));
    } catch (error) {
      console.error('Error getting duels by branch ID:', error);
      throw error;
    }
  },

  // --- NEW FUNCTIONS ADDED HERE ---

  /**
   * Get the duel leaderboard from the users table.
   * @param {number} limit - The number of users to return.
   * @param {number} offset - The starting position for pagination.
   * @returns {Promise<{users: Array, total: number}>}
   */
  async getLeaderboard(limit = 10, offset = 0) {
    try {
      // Your `users` table uses `user_id` as the primary key. Let's use that.
      const { data, error, count } = await supabase
        .from('users')
        .select('user_id, username, duels_won, duels_lost', { count: 'exact' })
        .order('duels_won', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Calculate win rate and map to the format the frontend expects
      const leaderboardUsers = data.map((user) => ({
        userId: user.user_id,
        username: user.username,
        wins: user.duels_won || 0,
        losses: user.duels_lost || 0,
        totalDuels: (user.duels_won || 0) + (user.duels_lost || 0),
        winRate:
          (user.duels_won || 0) /
          ((user.duels_won || 0) + (user.duels_lost || 0) || 1),
      }));

      return { users: leaderboardUsers, total: count };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  },

  /**
   * Get recommended opponents for a user.
   * @param {number} userId - The ID of the user requesting recommendations.
   * @param {number} limit - The number of recommendations to return.
   * @returns {Promise<Array>}
   */
  async getRecommendedOpponents(userId, limit = 5) {
    try {
      // 1. Get IDs of the current user's friends to exclude them.
      const { data: friends } = await supabase
        .from('user_friends')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      const friendIds = friends ? friends.map((f) => f.friend_id) : [];

      // 2. Find users who are NOT the current user and NOT in the friends list.
      const usersToExclude = [userId, ...friendIds];

      const { data, error } = await supabase
        .from('users')
        .select('user_id, username, duels_won, duels_lost')
        .not('user_id', 'in', `(${usersToExclude.join(',')})`)
        .limit(limit);

      if (error) throw error;

      // 3. Map the data to the format expected by the frontend service.
      return data.map((user) => ({
        userId: user.user_id,
        username: user.username,
        skillLevel: user.duels_won || 0,
        winRate:
          (user.duels_won || 0) /
          ((user.duels_won || 0) + (user.duels_lost || 0) || 1),
        totalDuels: (user.duels_won || 0) + (user.duels_lost || 0),
        compatibility: Math.random(),
      }));
    } catch (error) {
      console.error('Error getting recommended opponents:', error);
      throw error;
    }
  },

  async createWithNotification(
    initiatorId,
    opponentId,
    testId = null,
    questionCount = 5, // Increased default to 5
    branchType = 'mixed',
    selectionType = 'random',
    branchId = null,
    courseId = null, // NEW: Add courseId parameter
  ) {
    try {
      // Use existing create function with new parameters
      const duel = await this.create(
        initiatorId,
        opponentId,
        testId,
        questionCount,
        branchType,
        selectionType,
        branchId,
        courseId,
      );

      // Get user and topic details for notification
      const { data: initiator } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', initiatorId)
        .single();

      let topicTitle = 'Mixed Topics';

      // Try to get course name if courseId is provided
      if (courseId) {
        const { data: course } = await supabase
          .from('courses')
          .select('title')
          .eq('course_id', courseId)
          .single();
        if (course) {
          topicTitle = course.title;
        }
      } else if (branchId) {
        // Fallback to topic if branchId is provided
        const { data: topic } = await supabase
          .from('topics')
          .select('title')
          .eq('topic_id', branchId)
          .single();
        if (topic) {
          topicTitle = topic.title;
        }
      }

      // Send duel invitation notification
      await notificationService.sendNotification(
        opponentId,
        'duel_invitation',
        'duel_invitation',
        {
          challenger_name: initiator?.username || 'Unknown',
          challenger_id: initiatorId,
          topic_name: topicTitle,
          duel_id: duel.duel_id,
        },
      );

      return duel;
    } catch (error) {
      console.error('Error creating duel with notification:', error);
      throw error;
    }
  },

  // Complete duel with notifications
  async completeWithNotifications(
    duelId,
    winnerId,
    initiatorScore,
    opponentScore,
  ) {
    try {
      // Use existing complete function
      const completedDuel = await this.complete(duelId);

      // Get duel and user details
      const duel = await this.getById(duelId);
      const { data: winner } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', winnerId)
        .single();

      const loserId =
        winnerId === duel.initiator_id ? duel.opponent_id : duel.initiator_id;
      const { data: loser } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', loserId)
        .single();

      // Send winner notification
      await notificationService.sendNotification(
        winnerId,
        'duel_result',
        'duel_result_winner',
        {
          opponent_name: loser?.username || 'Unknown',
          your_score:
            winnerId === duel.initiator_id ? initiatorScore : opponentScore,
          opponent_score:
            winnerId === duel.initiator_id ? opponentScore : initiatorScore,
          duel_id: duelId,
        },
      );

      // Send loser notification
      await notificationService.sendNotification(
        loserId,
        'duel_result',
        'duel_result_loser',
        {
          opponent_name: winner?.username || 'Unknown',
          your_score:
            loserId === duel.initiator_id ? initiatorScore : opponentScore,
          opponent_score:
            loserId === duel.initiator_id ? opponentScore : initiatorScore,
          duel_id: duelId,
        },
      );

      return completedDuel;
    } catch (error) {
      console.error('Error completing duel with notifications:', error);
      throw error;
    }
  },
};

module.exports = duelModel;
