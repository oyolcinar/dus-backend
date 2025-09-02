// =================== FULLY FIXED duelSocketHandler.js - Timeout Issue Resolved ===================

const { supabaseUrl, supabaseKey } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const db = require('../config/db');
const duelSessionService = require('../services/duelSessionService');
const botService = require('../services/botService');

const supabase = createClient(supabaseUrl, supabaseKey);

const activeSessions = new Map();
const userSockets = new Map();
const botSessions = new Map(); // duelId -> bot session info

// Track active question timers for server-controlled timing
const activeQuestionTimers = new Map(); // duelId -> timer info

// 🔧 FIX: Track active bot timeouts to prevent stale executions
const activeBotTimeouts = new Map(); // duelId -> timeout info

// CONSTANTS: Hard-coded 60 second timing
const QUESTION_TIME_LIMIT = 60000; // 60 seconds in milliseconds
const BOT_MIN_THINKING_TIME = 3000; // 3 seconds minimum
const BOT_MAX_THINKING_TIME = 57000; // 57 seconds maximum (3 second buffer)

const setupDuelSockets = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token)
        return next(new Error('Authentication error: No token provided'));
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user)
        return next(new Error('Authentication error: Invalid token'));
      const result = await db.query(
        'SELECT user_id, username, email, role FROM users WHERE auth_id = $1',
        [user.id],
      );
      const dbUser = result.rows[0];
      if (!dbUser)
        return next(new Error('Authentication error: User account not found'));
      socket.userId = dbUser.user_id;
      socket.username = dbUser.username;
      socket.email = dbUser.email;
      socket.role = dbUser.role;
      next();
    } catch (error) {
      console.error('Socket Auth: Unexpected error:', error);
      return next(new Error('Authentication error: Unexpected error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(
      `User ${socket.userId} (${socket.username}) connected: ${socket.id}`,
    );
    userSockets.set(socket.userId, socket.id);

    socket.on('join_duel_room', async (data) => {
      try {
        const { duelId } = data;
        const roomName = `duel_${duelId}`;
        const duel = await duelSessionService.getDuelById(duelId);
        if (
          !duel ||
          (duel.initiator_id !== socket.userId &&
            duel.opponent_id !== socket.userId)
        ) {
          return socket.emit('room_error', {
            message: 'Unauthorized to join this duel',
          });
        }
        if (duel.status !== 'active') {
          return socket.emit('room_error', { message: 'Duel is not active' });
        }
        socket.join(roomName);
        socket.currentDuelId = duelId;
        const opponentId =
          duel.initiator_id === socket.userId
            ? duel.opponent_id
            : duel.initiator_id;
        const isOpponentBot = await botService.isBot(opponentId);
        let session = activeSessions.get(duelId);
        if (!session) {
          session = await duelSessionService.createSession(duel);
          activeSessions.set(duelId, session);
        }
        session.connectedUsers.set(socket.userId, {
          socketId: socket.id,
          username: socket.username,
          ready: false,
        });
        socket.emit('room_joined', {
          session: {
            sessionId: session.sessionId,
            duelId: session.duelId,
            status: session.status,
            connectedUsers: Array.from(session.connectedUsers.values()).map(
              (u) => ({ username: u.username, ready: u.ready }),
            ),
          },
        });
        if (isOpponentBot) {
          botSessions.set(duelId, {
            botUserId: opponentId,
            humanUserId: socket.userId,
          });
          const botInfo = await botService.getBotInfo(opponentId);
          session.connectedUsers.set(opponentId, {
            socketId: `bot-${opponentId}`,
            username: botInfo?.botName || 'Dr. Bot',
            ready: false,
            isBot: true,
          });
          io.to(roomName).emit('opponent_joined', {
            username: botInfo?.botName || 'Dr. Bot',
            isBot: true,
          });
          setTimeout(() => io.to(roomName).emit('both_players_connected'), 500);
        } else {
          const opponentSocketId = userSockets.get(opponentId);
          if (opponentSocketId)
            io.to(opponentSocketId).emit('opponent_joined', {
              username: socket.username,
            });
          if (session.connectedUsers.size === 2)
            io.to(roomName).emit('both_players_connected');
        }
      } catch (error) {
        console.error('Error joining duel room:', error);
        socket.emit('room_error', { message: 'Failed to join duel room' });
      }
    });

    socket.on('ready_for_duel', async () => {
      try {
        const duelId = socket.currentDuelId;
        if (!duelId) return;
        const session = activeSessions.get(duelId);
        if (!session) return;
        const user = session.connectedUsers.get(socket.userId);
        if (user) user.ready = true;
        const roomName = `duel_${duelId}`;
        io.to(roomName).emit('player_ready', {
          userId: socket.userId,
          username: socket.username,
        });
        const botSessionInfo = botSessions.get(duelId);
        if (botSessionInfo) {
          const botUser = session.connectedUsers.get(botSessionInfo.botUserId);
          if (botUser) botUser.ready = true;
          io.to(roomName).emit('player_ready', {
            userId: botSessionInfo.botUserId,
            username: botUser?.username || 'Dr. Bot',
            isBot: true,
          });
        }
        const allReady = Array.from(session.connectedUsers.values()).every(
          (u) => u.ready,
        );
        if (allReady && session.connectedUsers.size === 2) {
          session.status = 'starting';
          activeSessions.set(duelId, session);
          let countdown = 3;
          const countdownInterval = setInterval(() => {
            io.to(roomName).emit('duel_starting', { countdown });
            countdown--;
            if (countdown < 0) {
              clearInterval(countdownInterval);
              startDuelSession(duelId, roomName, io);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error setting ready status:', error);
      }
    });

    socket.on('submit_answer', async (data) => {
      try {
        const { questionId, selectedAnswer, timeTaken } = data;
        const duelId = socket.currentDuelId;
        if (!duelId) return;
        const session = activeSessions.get(duelId);
        if (!session || session.status !== 'active') return;

        console.log(
          `BACKEND: Answer submitted by user ${socket.userId} for duel ${duelId}`,
        );
        console.log(
          `BACKEND: Question ${questionId} at index ${session.currentQuestionIndex}`,
        );
        console.log(
          `BACKEND: Processing lock status: ${session.processingLock}`,
        );

        await duelSessionService.submitAnswer(
          session.sessionId,
          socket.userId,
          questionId,
          session.currentQuestionIndex,
          selectedAnswer,
          timeTaken,
        );

        const roomName = `duel_${duelId}`;
        io.to(roomName).emit('opponent_answered', {
          userId: socket.userId,
          username: socket.username,
        });

        console.log(
          `BACKEND: About to check round completion for duel ${duelId}`,
        );
        await checkAndProcessRoundResultEnhanced(duelId, session, io);
        console.log(
          `BACKEND: Round completion check finished for duel ${duelId}`,
        );
      } catch (error) {
        console.error('BACKEND ERROR in submit_answer handler:', error);
        socket.emit('answer_error', { message: 'Failed to submit answer' });
      }
    });

    socket.on('challenge_bot', async (data) => {
      try {
        const { testId, courseId, difficulty = 1 } = data;

        if (!testId && !courseId) {
          return socket.emit('bot_challenge_error', {
            message: 'Either testId or courseId is required for bot challenge',
          });
        }

        let botDuel;

        if (courseId) {
          console.log(
            `Creating course-based bot challenge: courseId=${courseId}, difficulty=${difficulty}`,
          );
          botDuel = await botService.createBotDuelWithCourse(
            socket.userId,
            courseId,
            difficulty,
          );
        } else {
          console.log(
            `Creating test-based bot challenge: testId=${testId}, difficulty=${difficulty}`,
          );
          botDuel = await botService.createBotDuelLegacy(
            socket.userId,
            testId,
            difficulty,
          );
        }

        socket.emit('bot_challenge_created', { duel: botDuel });

        setTimeout(
          () => socket.emit('auto_join_duel', { duelId: botDuel.duel_id }),
          500,
        );
      } catch (error) {
        console.error('Error challenging bot:', error);
        socket.emit('bot_challenge_error', {
          message: error.message || 'Failed to create bot challenge',
        });
      }
    });

    socket.on('challenge_bot_course', async (data) => {
      try {
        const { courseId, difficulty = 1 } = data;

        if (!courseId) {
          return socket.emit('bot_challenge_error', {
            message: 'Course ID is required for course-based bot challenge',
          });
        }

        console.log(
          `Course-based bot challenge: courseId=${courseId}, difficulty=${difficulty}`,
        );

        const botDuel = await botService.createBotDuelWithCourse(
          socket.userId,
          courseId,
          difficulty,
        );

        socket.emit('bot_challenge_created', { duel: botDuel });

        setTimeout(
          () => socket.emit('auto_join_duel', { duelId: botDuel.duel_id }),
          500,
        );
      } catch (error) {
        console.error('Error challenging bot with course:', error);
        socket.emit('bot_challenge_error', {
          message:
            error.message || 'Failed to create course-based bot challenge',
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected: ${socket.id}`);
      userSockets.delete(socket.userId);
      const duelId = socket.currentDuelId;
      if (duelId) {
        const session = activeSessions.get(duelId);
        if (session) {
          session.connectedUsers.delete(socket.userId);
          io.to(`duel_${duelId}`).emit('opponent_disconnected', {
            userId: socket.userId,
            username: socket.username,
          });

          if (session.connectedUsers.size === 0) {
            cleanupDuelTimers(duelId);
            cleanupBotTimeouts(duelId);
            setTimeout(() => activeSessions.delete(duelId), 30000);
          }
        }
        botSessions.delete(duelId);
      }
    });
  });
};

async function startDuelSession(duelId, roomName, io) {
  try {
    console.log(`Starting duel session ${duelId}...`);

    const session = activeSessions.get(duelId);
    if (!session) {
      console.error(`Session not found for duel ${duelId}`);
      io.to(roomName).emit('room_error', {
        message: 'Duel session not found',
        code: 'SESSION_NOT_FOUND',
      });
      return;
    }

    session.status = 'active';
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;
    session.processingLock = false;

    try {
      console.log(`Fetching questions for duel ${duelId}...`);
      session.questions = await duelSessionService.getQuestionsForDuel(duelId);

      if (!session.questions || session.questions.length === 0) {
        throw new Error('No questions available for this course');
      }

      console.log(
        `Successfully loaded ${session.questions.length} questions for duel ${duelId}`,
      );
    } catch (questionError) {
      console.error(
        `Failed to get questions for duel ${duelId}:`,
        questionError,
      );

      io.to(roomName).emit('room_error', {
        message: `Sorular yüklenemedi: ${questionError.message}`,
        code: 'QUESTIONS_LOAD_FAILED',
      });
      return;
    }

    activeSessions.set(duelId, session);

    const duel = await duelSessionService.getDuelById(duelId);
    const isOpponentBot = await botService.isBot(duel.opponent_id);

    console.log(`Presenting first question for duel ${duelId}`);
    await presentNextQuestion(duelId, roomName, io, { isOpponentBot, duel });
  } catch (error) {
    console.error(`Critical error starting duel session ${duelId}:`, error);
    io.to(roomName).emit('room_error', {
      message: 'Düello başlatılırken kritik hata oluştu',
      code: 'CRITICAL_START_ERROR',
    });
  }
}

async function presentNextQuestion(duelId, roomName, io, botInfo = {}) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) {
      console.error(
        `Session not found when presenting question for duel ${duelId}`,
      );
      io.to(roomName).emit('room_error', {
        message: 'Duel session lost',
        code: 'SESSION_LOST',
      });
      return;
    }

    if (session.currentQuestionIndex >= session.questions.length) {
      console.log(`All questions completed for duel ${duelId}`);
      return await completeDuel(duelId, roomName, io);
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      console.error(
        `Question not found at index ${session.currentQuestionIndex} for duel ${duelId}`,
      );
      io.to(roomName).emit('room_error', {
        message: 'Soru bulunamadı',
        code: 'QUESTION_NOT_FOUND',
      });
      return await completeDuel(duelId, roomName, io);
    }

    if (
      !currentQuestion.question_id ||
      !currentQuestion.question_text ||
      !currentQuestion.options
    ) {
      console.error(
        `Invalid question structure for duel ${duelId}:`,
        currentQuestion,
      );
      io.to(roomName).emit('room_error', {
        message: 'Geçersiz soru yapısı',
        code: 'INVALID_QUESTION',
      });
      return;
    }

    // 🔧 FIX: Clean up any stale timeouts FIRST before starting new question
    cleanupDuelTimers(duelId);
    cleanupBotTimeouts(duelId);

    session.processingLock = false;
    activeSessions.set(duelId, session);

    console.log(
      `Presenting question ${session.currentQuestionIndex + 1}/${
        session.questions.length
      } for duel ${duelId}`,
    );

    const questionStartTime = Date.now();
    const timeLimit = QUESTION_TIME_LIMIT;

    // 🔧 FIX: Create the 60-second timeout and store its reference
    const questionTimeout = setTimeout(async () => {
      const currentSession = activeSessions.get(duelId);
      const timerInfo = activeQuestionTimers.get(duelId);

      if (
        currentSession &&
        timerInfo &&
        currentSession.currentQuestionIndex === timerInfo.questionIndex &&
        !currentSession.processingLock
      ) {
        console.log(
          `BACKEND: 60s timeout for question ${
            session.currentQuestionIndex + 1
          } in duel ${duelId}`,
        );

        io.to(roomName).emit('question_time_up', {
          questionIndex: session.currentQuestionIndex,
          serverTime: Date.now(),
        });

        await duelSessionService.autoSubmitUnanswered(
          session.sessionId,
          session.currentQuestionIndex,
        );
        await checkAndProcessRoundResultEnhanced(duelId, currentSession, io);

        activeQuestionTimers.delete(duelId);
      } else {
        console.log(
          `BACKEND: 60s timeout cancelled for duel ${duelId} - state changed`,
        );
      }
    }, timeLimit);

    // 🔧 FIX: Store ALL timer references including the question timeout
    activeQuestionTimers.set(duelId, {
      startTime: questionStartTime,
      timeLimit,
      questionIndex: session.currentQuestionIndex,
      endTime: questionStartTime + timeLimit,
      questionTimeout, // 🔧 Store the timeout reference for cancellation
      broadcastInterval: null, // Will be set by startServerTimerBroadcast
    });

    io.to(roomName).emit('question_presented', {
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      question: {
        id: currentQuestion.question_id,
        text: currentQuestion.question_text,
        options: currentQuestion.options,
      },
      timeLimit: timeLimit,
      serverStartTime: questionStartTime,
      serverEndTime: questionStartTime + timeLimit,
    });

    console.log(
      `Question ${
        session.currentQuestionIndex + 1
      } sent to room ${roomName} with 60s server-controlled timing`,
    );

    startServerTimerBroadcast(duelId, roomName, io, timeLimit);

    // Start bot thinking with proper cleanup
    if (botInfo.isOpponentBot) {
      console.log(
        `🤖 BACKEND: Starting bot thinking for question ${session.currentQuestionIndex}`,
      );

      setTimeout(() => {
        startBotThinkingForCurrentQuestion(duelId, roomName, io);
      }, 1000);
    }
  } catch (error) {
    console.error(`Error presenting question for duel ${duelId}:`, error);
    io.to(roomName).emit('room_error', {
      message: 'Soru sunulurken hata oluştu',
      code: 'QUESTION_PRESENT_ERROR',
    });
  }
}

// Server-side timer broadcast function
function startServerTimerBroadcast(duelId, roomName, io, timeLimit) {
  const timerInfo = activeQuestionTimers.get(duelId);
  if (!timerInfo) return;

  const timerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - timerInfo.startTime;
    const remaining = Math.max(0, timeLimit - elapsed);

    if (remaining <= 0 || !activeSessions.has(duelId)) {
      clearInterval(timerInterval);
      return;
    }

    io.to(roomName).emit('timer_update', {
      timeRemaining: Math.ceil(remaining / 1000),
      serverTime: now,
      questionIndex: timerInfo.questionIndex,
    });
  }, 1000);

  // Store the interval reference
  if (timerInfo) {
    timerInfo.broadcastInterval = timerInterval;
  }
}

// 🔧 FIX: Enhanced cleanup function - cancel ALL timeouts and intervals
function cleanupDuelTimers(duelId) {
  const timerInfo = activeQuestionTimers.get(duelId);
  if (timerInfo) {
    // Clear broadcast interval
    if (timerInfo.broadcastInterval) {
      clearInterval(timerInfo.broadcastInterval);
    }
    // 🔧 FIX: Clear the 60s question timeout
    if (timerInfo.questionTimeout) {
      clearTimeout(timerInfo.questionTimeout);
      console.log(`🔧 CLEANUP: Cancelled stale 60s timeout for duel ${duelId}`);
    }
  }
  activeQuestionTimers.delete(duelId);
}

// Bot timeout cleanup function
function cleanupBotTimeouts(duelId) {
  const botTimeoutInfo = activeBotTimeouts.get(duelId);
  if (botTimeoutInfo) {
    if (botTimeoutInfo.thinkingTimeout) {
      clearTimeout(botTimeoutInfo.thinkingTimeout);
      console.log(
        `🔧 CLEANUP: Cleared bot thinking timeout for duel ${duelId}`,
      );
    }
    activeBotTimeouts.delete(duelId);
  }
}

// Bot thinking logic with timeout tracking
async function startBotThinkingForCurrentQuestion(duelId, roomName, io) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) {
      console.log(
        `🤖 BACKEND: Session not found for duel ${duelId}, aborting bot thinking`,
      );
      return;
    }

    const duel = await duelSessionService.getDuelById(duelId);
    const isOpponentBot = await botService.isBot(duel.opponent_id);

    if (!isOpponentBot) {
      console.log(
        `🤖 BACKEND: Opponent is not a bot for duel ${duelId}, aborting`,
      );
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      console.log(
        `🤖 BACKEND: No current question for duel ${duelId}, aborting bot thinking`,
      );
      return;
    }

    // Check if bot thinking is already in progress for this duel
    if (activeBotTimeouts.has(duelId)) {
      console.log(
        `🤖 BACKEND: Bot thinking already in progress for duel ${duelId}, skipping`,
      );
      return;
    }

    const questionIndex = session.currentQuestionIndex;
    console.log(
      `🤖 BACKEND: Bot starting to think for question index ${questionIndex} (duel ${duelId})`,
    );

    const botAnswer = await botService.simulateBotAnswer(
      duel.opponent_id,
      currentQuestion.question_id,
      currentQuestion.correct_answer,
    );

    const botInfo = await botService.getBotInfo(duel.opponent_id);
    const botName = botInfo?.botName || 'Dr. Bot';

    console.log(
      `🤖 BACKEND: Bot ${botName} will answer in ${Math.floor(
        botAnswer.thinkingTime / 1000,
      )}s for question index ${questionIndex}`,
    );

    // Store the timeout so we can cancel it if needed
    const thinkingTimeout = setTimeout(async () => {
      try {
        // Double-check the session state hasn't changed
        const currentSession = activeSessions.get(duelId);
        if (!currentSession) {
          console.log(
            `🤖 BACKEND: Session no longer exists for duel ${duelId}, cancelling bot answer`,
          );
          activeBotTimeouts.delete(duelId);
          return;
        }

        if (currentSession.currentQuestionIndex !== questionIndex) {
          console.log(
            `🤖 BACKEND: Question changed from ${questionIndex} to ${currentSession.currentQuestionIndex} for duel ${duelId}, cancelling bot answer`,
          );
          activeBotTimeouts.delete(duelId);
          return;
        }

        if (currentSession.processingLock) {
          console.log(
            `🤖 BACKEND: Round is being processed for duel ${duelId}, cancelling bot answer`,
          );
          activeBotTimeouts.delete(duelId);
          return;
        }

        console.log(
          `🤖 BACKEND: Bot ${botName} thinking time completed for question ${questionIndex}`,
        );

        // Clear the timeout from our tracking
        activeBotTimeouts.delete(duelId);

        // Emit opponent answered event
        io.to(roomName).emit('opponent_answered', {
          userId: duel.opponent_id,
          username: botName,
          isBot: true,
        });

        console.log(
          `🤖 BACKEND: Bot ${botName} submitting answer for question index ${questionIndex}`,
        );

        // Submit the bot's answer
        await duelSessionService.submitAnswer(
          session.sessionId,
          duel.opponent_id,
          currentQuestion.question_id,
          questionIndex,
          botAnswer.selectedAnswer,
          botAnswer.timeTaken,
        );

        console.log(
          `🤖 BACKEND: Bot answer submitted, checking round completion after brief pause...`,
        );

        // Small delay before checking round completion
        setTimeout(async () => {
          const latestSession = activeSessions.get(duelId);
          if (
            latestSession &&
            latestSession.currentQuestionIndex === questionIndex
          ) {
            console.log(
              `🤖 BACKEND: Checking round completion after bot answer for question ${questionIndex}`,
            );
            await checkAndProcessRoundResultEnhanced(duelId, latestSession, io);
          } else {
            console.log(
              `🤖 BACKEND: Skipping round completion check - question has changed`,
            );
          }
        }, 1500);
      } catch (error) {
        console.error('🤖 BACKEND ERROR in bot answer execution:', error);
        activeBotTimeouts.delete(duelId);
      }
    }, botAnswer.thinkingTime);

    // Track the timeout so we can cancel it later
    activeBotTimeouts.set(duelId, {
      thinkingTimeout,
      questionIndex,
      startTime: Date.now(),
    });
  } catch (error) {
    console.error('🤖 BACKEND ERROR starting bot thinking:', error);
    activeBotTimeouts.delete(duelId);
  }
}

async function checkAndProcessRoundResultEnhanced(
  duelId,
  session,
  io,
  maxRetries = 3,
) {
  try {
    if (session.processingLock) {
      console.log(
        `BACKEND: Round already being processed for duel ${duelId}, skipping...`,
      );
      return;
    }

    console.log(
      `BACKEND: Checking round completion for duel ${duelId}, question ${session.currentQuestionIndex}`,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `BACKEND: Round completion check attempt ${attempt}/${maxRetries} for duel ${duelId}`,
      );

      const bothAnswered = await duelSessionService.checkBothAnswered(
        session.sessionId,
        session.currentQuestionIndex,
      );

      console.log(
        `BACKEND: Both answered result (attempt ${attempt}): ${bothAnswered}`,
      );

      if (bothAnswered) {
        session.processingLock = true;
        activeSessions.set(duelId, session);

        console.log(
          `BACKEND: Both players answered question ${session.currentQuestionIndex} for duel ${duelId} - PROCEEDING IMMEDIATELY`,
        );

        console.log(
          `BACKEND: Cleaning up timers for early completion of duel ${duelId}`,
        );
        // Clean up ALL timers immediately when round completes early
        cleanupDuelTimers(duelId);
        cleanupBotTimeouts(duelId);

        await processRoundResult(duelId, session, io);
        return;
      }

      if (attempt < maxRetries) {
        console.log(
          `BACKEND: Not both answered yet, retrying in 200ms... (attempt ${attempt}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(
      `BACKEND: After ${maxRetries} attempts, both players have not answered yet for duel ${duelId}`,
    );
  } catch (error) {
    console.error('BACKEND ERROR in enhanced round result check:', error);
    if (session) {
      session.processingLock = false;
      activeSessions.set(duelId, session);
    }
  }
}

async function processRoundResult(duelId, session, io) {
  try {
    console.log(
      `BACKEND: Processing round result for duel ${duelId}, question ${session.currentQuestionIndex}`,
    );

    const roomName = `duel_${duelId}`;
    const roundResults = await duelSessionService.getRoundResults(
      session.sessionId,
      session.currentQuestionIndex,
    );

    io.to(roomName).emit('round_result', roundResults);
    console.log(`BACKEND: Round result emitted to room ${roomName}`);

    session.currentQuestionIndex += 1;
    activeSessions.set(duelId, session);

    const isDuelOver = session.currentQuestionIndex >= session.questions.length;

    const roundDisplayTime = duelSessionService.getRoundResultDisplayTime();
    console.log(
      `BACKEND: Results will display for ${roundDisplayTime / 1000}s before ${
        isDuelOver ? 'completion' : 'next question'
      }`,
    );

    setTimeout(async () => {
      if (isDuelOver) {
        console.log(`BACKEND: Completing duel ${duelId} after results display`);
        await completeDuel(duelId, roomName, io);
      } else {
        console.log(
          `BACKEND: Moving to question ${session.currentQuestionIndex + 1}/${
            session.questions.length
          } after results display`,
        );

        session.processingLock = false;
        activeSessions.set(duelId, session);

        const duel = await duelSessionService.getDuelById(duelId);
        const isOpponentBot = await botService.isBot(duel.opponent_id);

        await presentNextQuestion(duelId, roomName, io, {
          isOpponentBot,
          duel,
        });
      }
    }, roundDisplayTime);
  } catch (error) {
    console.error('BACKEND ERROR processing round result:', error);
    if (session) {
      session.processingLock = false;
      activeSessions.set(duelId, session);
    }
    io.to(`duel_${duelId}`).emit('room_error', {
      message: 'Error processing round result.',
      code: 'ROUND_PROCESS_ERROR',
    });
  }
}

async function completeDuel(duelId, roomName, io) {
  try {
    cleanupDuelTimers(duelId);
    cleanupBotTimeouts(duelId);

    const session = activeSessions.get(duelId);
    if (!session) return;

    console.log(`BACKEND: Completing duel ${duelId}`);

    const finalResults = await duelSessionService.calculateFinalResults(
      session.sessionId,
    );

    if (finalResults) {
      await duelSessionService.completeDuelSession(
        session.sessionId,
        finalResults,
      );
      io.to(roomName).emit('duel_completed', finalResults);
      console.log(`BACKEND: Duel ${duelId} completed successfully`);
    } else {
      console.error(
        `BACKEND: Could not calculate final results for duel ${duelId}`,
      );
      io.to(roomName).emit('room_error', {
        message: 'Could not calculate final results.',
      });
    }

    botSessions.delete(duelId);
    setTimeout(() => {
      activeSessions.delete(duelId);
      cleanupDuelTimers(duelId);
      cleanupBotTimeouts(duelId);
      console.log(`BACKEND: Cleaned up completed session for duel ${duelId}`);
    }, 60000);
  } catch (error) {
    console.error('BACKEND ERROR completing duel:', error);
    cleanupDuelTimers(duelId);
    cleanupBotTimeouts(duelId);
  }
}

module.exports = setupDuelSockets;

// =================== END: FULLY FIXED duelSocketHandler.js ===================
