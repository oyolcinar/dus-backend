const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const duelResultModel = {
  // Record duel result
  async create(duelId, winnerId, initiatorScore, opponentScore) {
    try {
      const { data, error } = await supabase
        .from('duel_results')
        .insert({
          duel_id: duelId,
          winner_id: winnerId,
          initiator_score: initiatorScore,
          opponent_score: opponentScore,
        })
        .select(
          'duel_id, winner_id, initiator_score, opponent_score, created_at',
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating duel result:', error);
      throw error;
    }
  },

  // Get result by duel ID
  async getByDuelId(duelId) {
    try {
      const { data, error } = await supabase
        .from('duel_results')
        .select(
          `
          *,
          winner:users!duel_results_winner_id_fkey(username)
        `,
        )
        .eq('duel_id', duelId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No result found
          return null;
        }
        throw error;
      }

      // Transform the response to match the original format
      return data
        ? {
            duel_id: data.duel_id,
            winner_id: data.winner_id,
            initiator_score: data.initiator_score,
            opponent_score: data.opponent_score,
            created_at: data.created_at,
            winner_username: data.winner?.username,
          }
        : null;
    } catch (error) {
      console.error('Error getting duel result:', error);
      throw error;
    }
  },

  // Get user's win/loss statistics
  async getUserStats(userId) {
    try {
      // 1. Get wins
      const { data: winsData, error: winsError } = await supabase
        .from('duel_results')
        .select('duel_id')
        .eq('winner_id', userId);

      if (winsError) throw winsError;

      // 2. Get total duels where user participated
      const { data: duelsData, error: duelsError } = await supabase
        .from('duels')
        .select('duel_id, initiator_id, opponent_id')
        .or(`initiator_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'completed');

      if (duelsError) throw duelsError;

      // 3. Get scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('duels')
        .select(
          `
        duel_id,
        initiator_id,
        opponent_id,
        duel_results!inner(initiator_score, opponent_score)
      `,
        )
        .or(`initiator_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'completed');

      if (scoresError) throw scoresError;

      // Calculate statistics
      const wins = winsData?.length || 0;
      const totalDuels = duelsData?.length || 0;
      const losses = totalDuels - wins;

      // Calculate average score
      let totalScore = 0;
      let scoreCount = 0;

      if (scoresData && scoresData.length > 0) {
        for (const duel of scoresData) {
          if (!duel.duel_results || duel.duel_results.length === 0) continue;

          const result = duel.duel_results[0];
          if (!result) continue;

          if (duel.initiator_id === userId) {
            const score = Number(result.initiator_score);
            if (!isNaN(score)) {
              totalScore += score;
              scoreCount++;
            }
          } else if (duel.opponent_id === userId) {
            const score = Number(result.opponent_score);
            if (!isNaN(score)) {
              totalScore += score;
              scoreCount++;
            }
          }
        }
      }

      const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

      return {
        wins,
        losses,
        total_duels: totalDuels,
        win_rate: totalDuels > 0 ? wins / totalDuels : 0,
        avg_score: avgScore,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  },
};

module.exports = duelResultModel;
