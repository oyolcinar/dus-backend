const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

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
    testId,
    questionCount = 3,
    branchType = 'mixed',
    selectionType = 'random',
    branchId = null,
  ) {
    try {
      const { data, error } = await supabase
        .from('duels')
        .insert({
          initiator_id: initiatorId,
          opponent_id: opponentId,
          test_id: testId,
          status: 'pending',
          question_count: questionCount,
          branch_type: branchType,
          selection_type: selectionType,
          branch_id: branchId,
        })
        .select(
          'duel_id, initiator_id, opponent_id, test_id, status, start_time, end_time, created_at, question_count, branch_type, selection_type, branch_id',
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating duel:', error);
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
          test:tests(title)
        `,
        )
        .eq('duel_id', duelId)
        .single();

      if (error) throw error;

      // Transform the response to match the original format
      return {
        duel_id: data.duel_id,
        initiator_id: data.initiator_id,
        opponent_id: data.opponent_id,
        test_id: data.test_id,
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
          test:tests(title)
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
        status: duel.status,
        created_at: duel.created_at,
        question_count: duel.question_count,
        branch_type: duel.branch_type,
        selection_type: duel.selection_type,
        branch_id: duel.branch_id,
        initiator_username: duel.initiator?.username,
        opponent_username: duel.opponent?.username,
        test_title: duel.test?.title,
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
          test:tests(title)
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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error accepting duel:', error);
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
          test:tests(title)
        `,
        )
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the response to match the original format
      return data.map((duel) => ({
        duel_id: duel.duel_id,
        initiator_id: duel.initiator_id,
        opponent_id: duel.opponent_id,
        test_id: duel.test_id,
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
      }));
    } catch (error) {
      console.error('Error getting duels by branch ID:', error);
      throw error;
    }
  },
};

module.exports = duelModel;
