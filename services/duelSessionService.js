// =================== START: COMPLETE duelSessionService.js FILE ===================

const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
const duelModel = require('../models/duelModel');
const duelResultModel = require('../models/duelResultModel');

const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const duelSessionService = {
  async getDuelById(duelId) {
    return await duelModel.getById(duelId);
  },

  async createSession(duel) {
    try {
      const { data: session, error } = await supabase
        .from('duel_sessions')
        .insert({
          duel_id: duel.duel_id,
          status: 'waiting',
          current_question_index: 0,
          questions: [],
        })
        .select('*')
        .single();
      if (error) throw error;
      return {
        sessionId: session.session_id,
        duelId: session.duel_id,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        questions: session.questions || [],
        connectedUsers: new Map(),
      };
    } catch (error) {
      console.error('Error creating duel session:', error);
      throw error;
    }
  },

  async getQuestionsForDuel(duelId) {
    try {
      const duel = await this.getDuelById(duelId);
      if (!duel || !duel.test_id) throw new Error('Duel or test not found');
      const { data: questions, error } = await supabase
        .from('test_questions')
        .select(
          'question_id, test_id, question_text, options, correct_answer, explanation',
        )
        .eq('test_id', duel.test_id);
      if (error) throw error;
      if (!questions || questions.length === 0)
        throw new Error(`No questions found for test_id: ${duel.test_id}`);
      const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
      const limitedQuestions = shuffledQuestions.slice(
        0,
        duel.question_count || 3,
      );
      await supabase
        .from('duel_sessions')
        .update({ questions: limitedQuestions })
        .eq('duel_id', duelId);
      return limitedQuestions;
    } catch (error) {
      console.error('Error getting questions for duel:', error);
      throw error;
    }
  },

  async submitAnswer(
    sessionId,
    userId,
    questionId,
    questionIndex,
    selectedAnswer,
    timeTaken,
  ) {
    try {
      const { data: question, error: questionError } = await supabase
        .from('test_questions')
        .select('correct_answer')
        .eq('question_id', questionId)
        .single();
      if (questionError) throw questionError;
      const isCorrect = selectedAnswer === question.correct_answer;
      const { error } = await supabase
        .from('duel_answers')
        .insert({
          session_id: sessionId,
          user_id: userId,
          question_id: questionId,
          question_index: questionIndex,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          answer_time_ms: timeTaken,
        });
      if (error) throw error;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  async checkBothAnswered(sessionId, questionIndex) {
    try {
      const { count, error } = await supabase
        .from('duel_answers')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex);
      if (error) throw error;
      return count >= 2;
    } catch (error) {
      console.error('Error checking both answered:', error);
      return false;
    }
  },

  async getRoundResults(sessionId, questionIndex) {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('duel_sessions')
        .select('questions')
        .eq('session_id', sessionId)
        .single();
      if (sessionError) throw sessionError;
      const questionDetails = session.questions?.[questionIndex];
      if (!questionDetails) {
        console.error(
          `Could not find question details at index ${questionIndex} for session ${sessionId}`,
        );
        return { questionIndex, question: {}, answers: [] };
      }
      const { data: answersData, error: answersError } = await supabase
        .from('duel_answers')
        .select('user_id, selected_answer, is_correct, answer_time_ms')
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex);
      if (answersError) throw answersError;
      return {
        questionIndex,
        question: {
          text: questionDetails.question_text,
          options: questionDetails.options,
          correctAnswer: questionDetails.correct_answer,
          explanation: questionDetails.explanation || null,
        },
        answers: answersData.map((a) => ({
          userId: a.user_id,
          selectedAnswer: a.selected_answer,
          isCorrect: a.is_correct,
          timeTaken: a.answer_time_ms,
        })),
      };
    } catch (error) {
      console.error('Error getting round results:', error);
      return { questionIndex, question: {}, answers: [] };
    }
  },

  async autoSubmitUnanswered(sessionId, questionIndex) {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('duel_sessions')
        .select('duel_id, questions')
        .eq('session_id', sessionId)
        .single();
      if (sessionError) throw sessionError;
      const currentQuestion = session.questions?.[questionIndex];
      if (!currentQuestion || !currentQuestion.question_id) {
        console.error(
          `FATAL: Could not find question_id for timeout at index ${questionIndex} in session ${sessionId}`,
        );
        return;
      }
      const { data: duel, error: duelError } = await supabase
        .from('duels')
        .select('initiator_id, opponent_id')
        .eq('duel_id', session.duel_id)
        .single();
      if (duelError) throw duelError;
      const { data: existingAnswers, error: answersError } = await supabase
        .from('duel_answers')
        .select('user_id')
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex);
      if (answersError) throw answersError;
      const answeredUserIds = existingAnswers.map((a) => a.user_id);
      const allUserIds = [duel.initiator_id, duel.opponent_id];
      const unansweredUserIds = allUserIds.filter(
        (id) => !answeredUserIds.includes(id),
      );
      if (unansweredUserIds.length > 0) {
        const autoSubmissions = unansweredUserIds.map((userId) => ({
          session_id: sessionId,
          user_id: userId,
          question_id: currentQuestion.question_id,
          question_index: questionIndex,
          selected_answer: null,
          is_correct: false,
          answer_time_ms: 30000,
        }));
        console.log(
          `⏰ Auto-submitting timeout answers for users: ${unansweredUserIds.join(
            ', ',
          )}`,
        );
        const { error: insertError } = await supabase
          .from('duel_answers')
          .insert(autoSubmissions);
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error auto-submitting unanswered:', error);
    }
  },

  async calculateFinalResults(sessionId) {
    try {
      const { data: answers, error } = await supabase
        .from('duel_answers')
        .select('user_id, is_correct, answer_time_ms')
        .eq('session_id', sessionId);
      if (error || !answers || answers.length < 1) return null;
      const userScores = {};
      const { data: session, error: sessionError } = await supabase
        .from('duel_sessions')
        .select('duel_id')
        .eq('session_id', sessionId)
        .single();
      if (sessionError) return null;
      const { data: duel, error: duelError } = await supabase
        .from('duels')
        .select('initiator_id, opponent_id')
        .eq('duel_id', session.duel_id)
        .single();
      if (duelError) return null;

      const allPlayerIds = [duel.initiator_id, duel.opponent_id];
      allPlayerIds.forEach((id) => {
        userScores[id] = { correctAnswers: 0, totalTime: 0, totalQuestions: 0 };
      });

      answers.forEach((answer) => {
        if (userScores[answer.user_id]) {
          userScores[answer.user_id].totalQuestions++;
          if (answer.is_correct) userScores[answer.user_id].correctAnswers++;
          userScores[answer.user_id].totalTime +=
            answer.answer_time_ms || 30000;
        }
      });

      const [user1Id, user2Id] = allPlayerIds.map(String);
      const user1Score = userScores[user1Id];
      const user2Score = userScores[user2Id];
      let winnerId = null;

      if (user1Score.correctAnswers > user2Score.correctAnswers)
        winnerId = parseInt(user1Id);
      else if (user2Score.correctAnswers > user1Score.correctAnswers)
        winnerId = parseInt(user2Id);
      else if (user1Score.totalTime < user2Score.totalTime)
        winnerId = parseInt(user1Id);
      else if (user2Score.totalTime < user1Score.totalTime)
        winnerId = parseInt(user2Id);

      return {
        winnerId,
        user1: {
          userId: parseInt(user1Id),
          score: user1Score.correctAnswers,
          totalTime: user1Score.totalTime,
          accuracy:
            user1Score.correctAnswers / (user1Score.totalQuestions || 1),
        },
        user2: {
          userId: parseInt(user2Id),
          score: user2Score.correctAnswers,
          totalTime: user2Score.totalTime,
          accuracy:
            user2Score.correctAnswers / (user2Score.totalQuestions || 1),
        },
      };
    } catch (error) {
      console.error('Error calculating final results:', error);
      return null;
    }
  },

  async completeDuelSession(sessionId, finalResults) {
    try {
      const { data: session, error: sessionError } = await supabase
        .from('duel_sessions')
        .select('duel_id')
        .eq('session_id', sessionId)
        .single();
      if (sessionError) throw sessionError;
      await supabase
        .from('duel_sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('session_id', sessionId);
      await duelModel.complete(session.duel_id);
      const { user1, user2, winnerId } = finalResults;
      const duel = await duelModel.getById(session.duel_id);
      let initiatorScore =
        user1.userId === duel.initiator_id ? user1.score : user2.score;
      let opponentScore =
        user1.userId === duel.opponent_id ? user1.score : user2.score;
      await duelResultModel.create(
        session.duel_id,
        winnerId,
        initiatorScore,
        opponentScore,
      );
      if (winnerId) {
        await this.updateUserStats(winnerId, true);
        const loserId = winnerId === user1.userId ? user2.userId : user1.userId;
        await this.updateUserStats(loserId, false);
      } else {
        await this.updateUserStats(user1.userId, null);
        await this.updateUserStats(user2.userId, null);
      }
    } catch (error) {
      console.error('Error completing duel session:', error);
    }
  },

  async updateUserStats(userId, won) {
    try {
      let updateData = {};
      if (won === true)
        updateData = {
          total_duels: supabase.raw('total_duels + 1'),
          duels_won: supabase.raw('duels_won + 1'),
          current_losing_streak: 0,
        };
      else if (won === false)
        updateData = {
          total_duels: supabase.raw('total_duels + 1'),
          duels_lost: supabase.raw('duels_lost + 1'),
          current_losing_streak: supabase.raw('current_losing_streak + 1'),
        };
      else
        updateData = {
          total_duels: supabase.raw('total_duels + 1'),
          current_losing_streak: 0,
        };
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId);
      if (error) throw error;
      if (won === false) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('current_losing_streak, longest_losing_streak')
          .eq('user_id', userId)
          .single();
        if (
          !userError &&
          user.current_losing_streak > user.longest_losing_streak
        ) {
          await supabase
            .from('users')
            .update({ longest_losing_streak: user.current_losing_streak })
            .eq('user_id', userId);
        }
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  },
};

module.exports = duelSessionService;

// =================== END: COMPLETE duelSessionService.js FILE ===================
