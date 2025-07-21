// services/duelSessionService.js
const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
const duelModel = require('../models/duelModel');
const duelResultModel = require('../models/duelResultModel');

const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const duelSessionService = {
  // Get duel by ID
  async getDuelById(duelId) {
    return await duelModel.getById(duelId);
  },

  // Create a new duel session
  async createSession(duel) {
    try {
      // Create session in database
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

      // Return session with connected users map
      return {
        sessionId: session.session_id,
        duelId: session.duel_id,
        status: session.status,
        currentQuestionIndex: session.current_question_index,
        questions: session.questions || [],
        connectedUsers: new Map(), // Will be populated when users connect
        createdAt: session.created_at,
      };
    } catch (error) {
      console.error('Error creating duel session:', error);
      throw error;
    }
  },

  // Get questions for a duel based on test_id
  async getQuestionsForDuel(duelId) {
    try {
      // Get duel and test information
      const duel = await this.getDuelById(duelId);
      if (!duel || !duel.test_id) {
        throw new Error('Duel or test not found');
      }

      // Get questions from the test with explicit field selection
      // Note: options will be in format {"A": "answer1", "B": "answer2", ...}
      // and explanation field is now included
      const { data: questions, error } = await supabase
        .from('test_questions')
        .select(
          'question_id, test_id, question_text, options, correct_answer, explanation, created_at',
        )
        .eq('test_id', duel.test_id)
        .order('question_id');

      if (error) throw error;

      // Shuffle questions and limit to question_count
      const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
      const limitedQuestions = shuffledQuestions.slice(
        0,
        duel.question_count || 3,
      );

      // Update session with questions
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

  // REPLACE WITH THIS
  async submitAnswer(
    sessionId,
    userId,
    questionId,
    questionIndex, // <-- Add this new parameter
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

      const { data: answer, error } = await supabase
        .from('duel_answers')
        .insert({
          session_id: sessionId,
          user_id: userId,
          question_id: questionId,
          question_index: questionIndex, // <-- CRITICAL FIX: Use the passed-in index
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          answer_time_ms: timeTaken,
        })
        .select('*')
        .single();
      if (error) throw error;

      return {
        answerId: answer.answer_id,
        isCorrect: isCorrect,
        timeTaken: timeTaken,
      };
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  },

  // Check if both players have answered current question
  async checkBothAnswered(sessionId, questionIndex) {
    try {
      const { data: answers, error } = await supabase
        .from('duel_answers')
        .select('user_id')
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex);

      if (error) throw error;

      return answers.length >= 2;
    } catch (error) {
      console.error('Error checking both answered:', error);
      return false;
    }
  },

  // Get round results for a specific question
  // REPLACE WITH THIS CORRECTED VERSION
  async getRoundResults(sessionId, questionIndex) {
    try {
      // 1. Get the session to reliably access the question list
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
        // Return a structured but empty payload to prevent crashes
        return { questionIndex, question: {}, answers: [] };
      }

      // 2. Now, get all the answers for this round
      const { data: answersData, error: answersError } = await supabase
        .from('duel_answers')
        .select('user_id, selected_answer, is_correct, answer_time_ms')
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex);
      if (answersError) throw answersError;

      // 3. Construct a complete and valid payload using the reliable data
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
      // On any error, return a safe, empty structure
      return { questionIndex, question: {}, answers: [] };
    }
  },

  // Auto-submit for users who didn't answer in time
  // REPLACE WITH THIS CORRECTED VERSION
  async autoSubmitUnanswered(sessionId, questionIndex) {
    try {
      // 1. Get the session, which contains the list of questions for this duel
      const { data: session, error: sessionError } = await supabase
        .from('duel_sessions')
        .select('duel_id, questions') // We need the 'questions' array!
        .eq('session_id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // 2. Find the specific question ID for the current round
      const currentQuestion = session.questions?.[questionIndex];
      if (!currentQuestion || !currentQuestion.question_id) {
        console.error(
          `FATAL: Could not find question_id for index ${questionIndex} in session ${sessionId}`,
        );
        // If we can't find the question, we can't submit an answer.
        return false;
      }
      const questionIdForRound = currentQuestion.question_id;

      // 3. Get duel participants
      const { data: duel, error: duelError } = await supabase
        .from('duels')
        .select('initiator_id, opponent_id')
        .eq('duel_id', session.duel_id)
        .single();
      if (duelError) throw duelError;

      // 4. Check who has already answered
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

      // 5. Build the submission payload WITH the correct question_id
      const autoSubmissions = unansweredUserIds.map((userId) => ({
        session_id: sessionId,
        user_id: userId,
        question_id: questionIdForRound, // CRITICAL FIX: Use the correct ID
        question_index: questionIndex,
        selected_answer: null,
        is_correct: false,
        answer_time_ms: 30000,
      }));

      // 6. Insert the valid records
      if (autoSubmissions.length > 0) {
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

      return true;
    } catch (error) {
      console.error('Error auto-submitting unanswered:', error);
      return false; // Return false on failure
    }
  },

  // Check if both players have completed current question (answered or timed out)
  async checkBothCompleted(sessionId, questionIndex) {
    return await this.checkBothAnswered(sessionId, questionIndex);
  },

  // Calculate final results for the duel
  async calculateFinalResults(sessionId) {
    try {
      // Get all answers for this session
      const { data: answers, error } = await supabase
        .from('duel_answers')
        .select('user_id, is_correct, answer_time_ms')
        .eq('session_id', sessionId);

      if (error) throw error;

      // Calculate scores for each user
      const userScores = {};
      answers.forEach((answer) => {
        if (!userScores[answer.user_id]) {
          userScores[answer.user_id] = {
            correctAnswers: 0,
            totalTime: 0,
            totalQuestions: 0,
          };
        }

        userScores[answer.user_id].totalQuestions++;
        if (answer.is_correct) {
          userScores[answer.user_id].correctAnswers++;
        }
        userScores[answer.user_id].totalTime += answer.answer_time_ms || 30000;
      });

      // Determine winner (highest correct answers, then fastest time)
      const userIds = Object.keys(userScores);
      const [user1Id, user2Id] = userIds;

      const user1Score = userScores[user1Id];
      const user2Score = userScores[user2Id];

      let winnerId = null;
      if (user1Score.correctAnswers > user2Score.correctAnswers) {
        winnerId = parseInt(user1Id);
      } else if (user2Score.correctAnswers > user1Score.correctAnswers) {
        winnerId = parseInt(user2Id);
      } else if (user1Score.totalTime < user2Score.totalTime) {
        winnerId = parseInt(user1Id);
      } else if (user2Score.totalTime < user1Score.totalTime) {
        winnerId = parseInt(user2Id);
      }
      // If tied on both, winnerId remains null (draw)

      return {
        winnerId,
        user1: {
          userId: parseInt(user1Id),
          score: user1Score.correctAnswers,
          totalTime: user1Score.totalTime,
          accuracy: user1Score.correctAnswers / user1Score.totalQuestions,
        },
        user2: {
          userId: parseInt(user2Id),
          score: user2Score.correctAnswers,
          totalTime: user2Score.totalTime,
          accuracy: user2Score.correctAnswers / user2Score.totalQuestions,
        },
      };
    } catch (error) {
      console.error('Error calculating final results:', error);
      throw error;
    }
  },

  // Complete the duel session and create duel result
  async completeDuelSession(sessionId, finalResults) {
    try {
      // Get session info
      const { data: session, error: sessionError } = await supabase
        .from('duel_sessions')
        .select('duel_id')
        .eq('session_id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Update session status
      await supabase
        .from('duel_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);

      // Complete the duel
      await duelModel.complete(session.duel_id);

      // Create duel result
      const { user1, user2, winnerId } = finalResults;
      const initiatorScore = user1.score;
      const opponentScore = user2.score;

      const result = await duelResultModel.create(
        session.duel_id,
        winnerId,
        initiatorScore,
        opponentScore,
      );

      // Update user statistics
      if (winnerId) {
        await this.updateUserStats(winnerId, true);
        const loserId = winnerId === user1.userId ? user2.userId : user1.userId;
        await this.updateUserStats(loserId, false);
      } else {
        // Draw
        await this.updateUserStats(user1.userId, null);
        await this.updateUserStats(user2.userId, null);
      }

      return {
        sessionId,
        duelId: session.duel_id,
        finalResults,
        result,
      };
    } catch (error) {
      console.error('Error completing duel session:', error);
      throw error;
    }
  },

  // Update user duel statistics
  async updateUserStats(userId, won) {
    try {
      let updateData = {};

      if (won === true) {
        updateData = {
          total_duels: supabase.raw('total_duels + 1'),
          duels_won: supabase.raw('duels_won + 1'),
          current_losing_streak: 0,
        };
      } else if (won === false) {
        updateData = {
          total_duels: supabase.raw('total_duels + 1'),
          duels_lost: supabase.raw('duels_lost + 1'),
          current_losing_streak: supabase.raw('current_losing_streak + 1'),
        };
      } else {
        // Draw
        updateData = {
          total_duels: supabase.raw('total_duels + 1'),
          current_losing_streak: 0,
        };
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      // Update longest losing streak if needed
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
      throw error;
    }
  },

  // Get session with questions for debugging/admin purposes
  async getSessionWithQuestions(sessionId) {
    try {
      const { data: session, error } = await supabase
        .from('duel_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;

      return {
        ...session,
        questions: session.questions || [], // Questions will be in new format with explanation
      };
    } catch (error) {
      console.error('Error getting session with questions:', error);
      throw error;
    }
  },
};

module.exports = duelSessionService;
