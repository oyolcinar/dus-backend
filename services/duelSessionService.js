// =================== START: COMPLETE duelSessionService.js FILE with 60s timing ===================

const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
const duelModel = require('../models/duelModel');
const duelResultModel = require('../models/duelResultModel');

const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

// ✅ CONSTANTS: Hard-coded 60 second timing
const QUESTION_TIME_LIMIT = 60000; // 60 seconds in milliseconds

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
      console.log(`📚 Getting questions for duel ${duelId}...`);

      const duel = await this.getDuelById(duelId);
      if (!duel) {
        throw new Error(`Duel ${duelId} not found`);
      }

      console.log(`📚 Duel details:`, {
        duelId: duel.duel_id,
        courseId: duel.course_id,
        testId: duel.test_id,
        questionCount: duel.question_count,
      });

      // Get course_id from duel or from test if test_id exists
      let courseId = null;

      if (duel.course_id) {
        // Direct course reference (new system)
        courseId = duel.course_id;
        console.log(`📚 Using direct course_id: ${courseId}`);
      } else if (duel.test_id) {
        // Legacy: get course_id from test (backward compatibility)
        console.log(`📚 Getting course_id from test_id: ${duel.test_id}`);
        const { data: test, error: testError } = await supabase
          .from('tests')
          .select('course_id')
          .eq('test_id', duel.test_id)
          .single();

        if (testError) {
          console.error(
            `❌ Error getting test for test_id ${duel.test_id}:`,
            testError,
          );
          throw testError;
        }
        courseId = test.course_id;
        console.log(`📚 Found course_id from test: ${courseId}`);
      }

      if (!courseId) {
        throw new Error(
          `No course found for duel ${duelId} (course_id: ${duel.course_id}, test_id: ${duel.test_id})`,
        );
      }

      console.log(`📚 Fetching questions for course_id: ${courseId}`);

      // Get all questions from all tests in this course
      const { data: questions, error } = await supabase
        .from('test_questions')
        .select(
          `
        question_id, 
        test_id, 
        question_text, 
        options, 
        correct_answer, 
        explanation,
        tests!inner(course_id)
      `,
        )
        .eq('tests.course_id', courseId);

      if (error) {
        console.error(
          `❌ Database error fetching questions for course ${courseId}:`,
          error,
        );
        throw error;
      }

      if (!questions || questions.length === 0) {
        console.error(`❌ No questions found for course_id: ${courseId}`);

        // DEBUG: Check if course exists
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('course_id', courseId)
          .single();

        if (courseError) {
          console.error(`❌ Course ${courseId} does not exist:`, courseError);
          throw new Error(`Course ${courseId} not found in database`);
        }

        // DEBUG: Check if tests exist for this course
        const { data: tests, error: testsError } = await supabase
          .from('tests')
          .select('test_id, title')
          .eq('course_id', courseId);

        if (testsError) {
          console.error(
            `❌ Error checking tests for course ${courseId}:`,
            testsError,
          );
        } else {
          console.log(
            `📚 Found ${tests?.length || 0} tests for course ${courseId}:`,
            tests,
          );
        }

        throw new Error(
          `No questions found for course "${course.title}" (ID: ${courseId}). Course exists but has no test questions.`,
        );
      }

      console.log(
        `✅ Found ${questions.length} questions for course_id: ${courseId}`,
      );

      // Shuffle and select questions
      const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
      const questionCount = duel.question_count || 5;
      const limitedQuestions = shuffledQuestions.slice(0, questionCount);

      console.log(
        `✅ Selected ${limitedQuestions.length} questions for duel ${duelId}`,
      );

      // Update duel session with selected questions
      await supabase
        .from('duel_sessions')
        .update({ questions: limitedQuestions })
        .eq('duel_id', duelId);

      return limitedQuestions;
    } catch (error) {
      console.error(
        `💥 Critical error getting questions for duel ${duelId}:`,
        error,
      );
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
      const { error } = await supabase.from('duel_answers').insert({
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

  // ✅ UPDATED: autoSubmitUnanswered with 60s timing
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
          answer_time_ms: QUESTION_TIME_LIMIT, // ✅ NOW 60000ms = 60 seconds
        }));

        console.log(
          `⏰ Auto-submitting 60s timeout answers for users: ${unansweredUserIds.join(
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

  // ✅ UPDATED: calculateFinalResults with 60s timing
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
            answer.answer_time_ms || QUESTION_TIME_LIMIT; // ✅ NOW 60000ms = 60 seconds
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
