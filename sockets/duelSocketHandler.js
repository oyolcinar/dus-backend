// =================== START: COMPLETE duelSocketHandler.js FILE ===================

const { supabaseUrl, supabaseKey } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const db = require('../config/db');
const duelSessionService = require('../services/duelSessionService');
const botService = require('../services/botService');

// Create Supabase client using your existing config
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory store for active duel sessions (use Redis in production)
const activeSessions = new Map();
const userSockets = new Map(); // userId -> socketId
const botSessions = new Map(); // duelId -> bot session info

const setupDuelSockets = (io) => {
  // Enhanced middleware for socket authentication using your existing Supabase logic
  io.use(async (socket, next) => {
    try {
      console.log('🔧 Socket Auth: Starting authentication...');

      // Get the token from the socket handshake (same as your HTTP middleware)
      const token = socket.handshake.auth.token;

      if (!token) {
        console.log('🔧 Socket Auth: No token provided');
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify the token with Supabase (exactly like your authSupabase.js middleware)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.log(
          '🔧 Socket Auth: Supabase verification failed:',
          error?.message || 'No user',
        );
        return next(new Error('Authentication error: Invalid token'));
      }

      // Get the user from your database using auth_id (exactly like your middleware)
      const query = `
        SELECT user_id, username, email, role, subscription_type 
        FROM users 
        WHERE auth_id = $1
      `;

      try {
        const result = await db.query(query, [user.id]);
        const dbUser = result.rows[0];

        if (!dbUser) {
          console.log(
            '🔧 Socket Auth: User not found in database for auth_id:',
            user.id,
          );
          return next(
            new Error('Authentication error: User account not found'),
          );
        }

        // Attach the user information to the socket (same structure as your HTTP middleware)
        socket.userId = dbUser.user_id;
        socket.username = dbUser.username;
        socket.email = dbUser.email;
        socket.role = dbUser.role;
        socket.subscriptionType = dbUser.subscription_type;
        socket.authId = user.id;

        console.log(
          '🔧 Socket Auth: Authentication successful for user:',
          socket.username,
        );
        next();
      } catch (dbError) {
        console.error(
          '🔧 Socket Auth: Database error during authentication:',
          dbError,
        );
        return next(new Error('Authentication error: Database error'));
      }
    } catch (error) {
      console.error(
        '🔧 Socket Auth: Unexpected error during authentication:',
        error,
      );
      return next(new Error('Authentication error: Unexpected error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(
      `User ${socket.userId} (${socket.username}) connected: ${socket.id}`,
    );

    // Store user socket mapping
    userSockets.set(socket.userId, socket.id);

    // Enhanced join duel room with bot detection
    socket.on('join_duel_room', async (data) => {
      try {
        const { duelId } = data;
        const roomName = `duel_${duelId}`;

        console.log(
          `🔧 Socket: User ${socket.username} (${socket.userId}) joining duel ${duelId}`,
        );

        // Verify user is part of this duel
        const duel = await duelSessionService.getDuelById(duelId);
        if (
          !duel ||
          (duel.initiator_id !== socket.userId &&
            duel.opponent_id !== socket.userId)
        ) {
          console.log(
            `🔧 Socket: User ${socket.userId} unauthorized for duel ${duelId}`,
          );
          return socket.emit('room_error', {
            message: 'Unauthorized to join this duel',
          });
        }

        // Check if duel is active
        if (duel.status !== 'active') {
          console.log(
            `🔧 Socket: Duel ${duelId} is not active (status: ${duel.status})`,
          );
          return socket.emit('room_error', { message: 'Duel is not active' });
        }

        // Join the room
        socket.join(roomName);
        socket.currentDuelId = duelId;

        // Check if there's a bot in this duel
        const opponentId =
          duel.initiator_id === socket.userId
            ? duel.opponent_id
            : duel.initiator_id;
        const isOpponentBot = await botService.isBot(opponentId);

        console.log(
          `🔍 Duel ${duelId}: User ${socket.userId} vs ${opponentId} (Bot: ${isOpponentBot})`,
        );

        // Get or create session
        let session = activeSessions.get(duelId);
        if (!session) {
          session = await duelSessionService.createSession(duel);
          activeSessions.set(duelId, session);
          console.log(`🔧 Socket: Created new session for duel ${duelId}`);
        }

        // Add user to session
        session.connectedUsers.set(socket.userId, {
          socketId: socket.id,
          username: socket.username,
          ready: false,
          connectedAt: new Date(),
        });

        console.log(
          `🔧 Socket: User ${socket.username} joined session for duel ${duelId}`,
        );

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
          console.log('🤖 Bot game detected, initializing bot behavior...');
          botSessions.set(duelId, {
            botUserId: opponentId,
            humanUserId: socket.userId,
            botAnswered: false,
            humanAnswered: false,
            processingRound: false,
            lastQuestionId: null,
          });
          const botInfo = await botService.getBotInfo(opponentId);
          session.connectedUsers.set(opponentId, {
            socketId: `bot-${opponentId}`,
            username: botInfo?.botName || 'Dr. Bot',
            ready: false,
            isBot: true,
          });
          activeSessions.set(duelId, session);
          io.to(roomName).emit('opponent_joined', {
            username: botInfo?.botName || 'Dr. Bot',
            isBot: true,
          });
          setTimeout(() => io.to(roomName).emit('both_players_connected'), 500);
        } else {
          // Human vs Human
          const opponentSocketId = userSockets.get(opponentId);
          if (opponentSocketId) {
            io.to(opponentSocketId).emit('opponent_joined', {
              username: socket.username,
            });
          }
          if (session.connectedUsers.size === 2) {
            io.to(roomName).emit('both_players_connected');
          }
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
          io.to(roomName).emit('duel_starting', { countdown });
          const countdownInterval = setInterval(() => {
            countdown--;
            io.to(roomName).emit('duel_starting', { countdown });
            if (countdown <= 0) {
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

        const botSessionInfo = botSessions.get(duelId);
        if (botSessionInfo && botSessionInfo.processingRound) {
          return console.log(
            `⚠️ Round already being processed for duel ${duelId}, ignoring user answer.`,
          );
        }

        console.log(
          `📝 User ${socket.username} submitted answer for question ${questionId} at index ${session.currentQuestionIndex}`,
        );

        await duelSessionService.submitAnswer(
          session.sessionId,
          socket.userId,
          questionId,
          session.currentQuestionIndex, // Pass correct index
          selectedAnswer,
          timeTaken,
        );

        const roomName = `duel_${duelId}`;
        io.to(roomName).emit('opponent_answered', {
          userId: socket.userId,
          username: socket.username,
        });

        if (botSessionInfo) {
          botSessionInfo.humanAnswered = true;
          botSessions.set(duelId, botSessionInfo);
          await checkAndProcessRoundResult(duelId, session, io);
        } else {
          const bothAnswered = await duelSessionService.checkBothAnswered(
            session.sessionId,
            session.currentQuestionIndex,
          );
          if (bothAnswered) await processRoundResult(duelId, session, io);
        }
      } catch (error) {
        console.error('Error in submit_answer handler:', error);
        socket.emit('answer_error', { message: 'Failed to submit answer' });
      }
    });

    socket.on('challenge_bot', async (data) => {
      try {
        const { testId, difficulty = 1 } = data;
        const botDuel = await botService.createBotDuel(
          socket.userId,
          testId,
          difficulty,
        );
        socket.emit('bot_challenge_created', { duel: botDuel });
        setTimeout(
          () => socket.emit('auto_join_duel', { duelId: botDuel.duel_id }),
          500,
        );
      } catch (error) {
        console.error('Error challenging bot:', error);
        socket.emit('bot_challenge_error', {
          message: 'Failed to create bot challenge',
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
          botSessions.delete(duelId);
          if (session.connectedUsers.size === 0) {
            setTimeout(() => {
              activeSessions.delete(duelId);
              console.log(`Cleaned up empty session for duel ${duelId}`);
            }, 30000);
          }
        }
      }
    });
  });
};

async function startDuelSession(duelId, roomName, io) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;
    session.status = 'active';
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;
    session.questions = await duelSessionService.getQuestionsForDuel(
      session.duelId,
    );
    activeSessions.set(duelId, session);
    console.log(
      `🎮 Starting duel session ${duelId} with ${session.questions.length} questions`,
    );
    const duel = await duelSessionService.getDuelById(duelId);
    const isOpponentBot = await botService.isBot(duel.opponent_id);
    await presentNextQuestion(duelId, roomName, io, { isOpponentBot, duel });
  } catch (error) {
    console.error('Error starting duel session:', error);
  }
}

async function presentNextQuestion(duelId, roomName, io, botInfo = {}) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;

    if (session.currentQuestionIndex >= session.questions.length) {
      return await completeDuel(duelId, roomName, io);
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      console.error(
        `FATAL: No question found at index ${session.currentQuestionIndex} for duel ${duelId}. Ending duel.`,
      );
      return await completeDuel(duelId, roomName, io);
    }

    const botSessionInfo = botSessions.get(duelId);
    if (botSessionInfo) {
      botSessionInfo.botAnswered = false;
      botSessionInfo.humanAnswered = false;
      botSessionInfo.processingRound = false;
      botSessionInfo.lastQuestionId = currentQuestion.question_id;
      botSessions.set(duelId, botSessionInfo);
    }

    console.log(
      `📝 Presenting question ${session.currentQuestionIndex + 1}/${
        session.questions.length
      } for duel ${duelId}`,
    );

    io.to(roomName).emit('question_presented', {
      questionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      question: {
        id: currentQuestion.question_id,
        text: currentQuestion.question_text,
        options: currentQuestion.options,
      },
      timeLimit: 30000,
    });

    if (botInfo.isOpponentBot) {
      handleBotAnswer(
        duelId,
        botInfo.duel.opponent_id,
        currentQuestion,
        session,
        io,
      );
    }

    setTimeout(async () => {
      const currentSession = activeSessions.get(duelId);
      const bsi = botSessions.get(duelId);
      if (
        currentSession &&
        bsi &&
        currentSession.currentQuestionIndex === session.currentQuestionIndex &&
        !bsi.processingRound
      ) {
        bsi.processingRound = true;
        botSessions.set(duelId, bsi);
        console.log(
          `⏰ Timeout for question ${
            session.currentQuestionIndex + 1
          } in duel ${duelId}`,
        );
        await duelSessionService.autoSubmitUnanswered(
          session.sessionId,
          session.currentQuestionIndex,
        );
        bsi.humanAnswered = true;
        bsi.botAnswered = true;
        botSessions.set(duelId, bsi);
        await checkAndProcessRoundResult(duelId, currentSession, io);
      }
    }, 30000);
  } catch (error) {
    console.error('Error presenting question:', error);
  }
}

async function handleBotAnswer(
  duelId,
  botUserId,
  currentQuestion,
  session,
  io,
) {
  try {
    const roomName = `duel_${duelId}`;
    const botAnswer = await botService.simulateBotAnswer(
      botUserId,
      currentQuestion.question_id,
      currentQuestion.correct_answer,
    );
    const botInfo = await botService.getBotInfo(botUserId);
    const botName = botInfo?.botName || 'Dr. Bot';

    console.log(`🤖 Bot ${botName} will answer in ${botAnswer.thinkingTime}ms`);

    setTimeout(async () => {
      try {
        const currentSession = activeSessions.get(duelId);
        const botSessionInfo = botSessions.get(duelId);
        if (
          !currentSession ||
          !botSessionInfo ||
          botSessionInfo.lastQuestionId !== currentQuestion.question_id ||
          botSessionInfo.botAnswered
        ) {
          return;
        }

        io.to(roomName).emit('opponent_answered', {
          userId: botUserId,
          username: botName,
          isBot: true,
        });
        console.log(
          `🤖 Bot ${botName} answering question index ${currentSession.currentQuestionIndex}`,
        );

        await duelSessionService.submitAnswer(
          session.sessionId,
          botUserId,
          currentQuestion.question_id,
          currentSession.currentQuestionIndex, // THE FIX
          botAnswer.selectedAnswer,
          botAnswer.timeTaken,
        );

        botSessionInfo.botAnswered = true;
        botSessions.set(duelId, botSessionInfo);
        await checkAndProcessRoundResult(duelId, currentSession, io);
      } catch (error) {
        console.error('Error in bot answer callback:', error);
      }
    }, botAnswer.thinkingTime);
  } catch (error) {
    console.error('Error handling bot answer:', error);
  }
}

async function checkAndProcessRoundResult(duelId, session, io) {
  try {
    const botSessionInfo = botSessions.get(duelId);
    // This check is for bot games only
    if (!botSessionInfo || botSessionInfo.processingRound) {
      return;
    }

    if (botSessionInfo.botAnswered && botSessionInfo.humanAnswered) {
      botSessionInfo.processingRound = true;
      botSessions.set(duelId, botSessionInfo);
      console.log(
        `🎯 Both players answered for duel ${duelId}, processing results...`,
      );
      await processRoundResult(duelId, session, io);
    }
  } catch (error) {
    console.error('Error checking and processing round result:', error);
  }
}

async function processRoundResult(duelId, session, io) {
  try {
    const roomName = `duel_${duelId}`;
    const roundResults = await duelSessionService.getRoundResults(
      session.sessionId,
      session.currentQuestionIndex,
    );

    io.to(roomName).emit('round_result', roundResults);

    session.currentQuestionIndex += 1;
    activeSessions.set(duelId, session);

    const isDuelOver = session.currentQuestionIndex >= session.questions.length;

    setTimeout(async () => {
      if (isDuelOver) {
        await completeDuel(duelId, roomName, io);
      } else {
        const currentSession = activeSessions.get(duelId);
        if (currentSession) {
          const duel = await duelSessionService.getDuelById(duelId);
          const isOpponentBot = await botService.isBot(duel.opponent_id);
          await presentNextQuestion(duelId, roomName, io, {
            isOpponentBot,
            duel,
          });
        }
      }
    }, 3000);
  } catch (error) {
    console.error('Error processing round result:', error);
    io.to(`duel_${duelId}`).emit('room_error', {
      message: 'Error processing round result.',
    });
  }
}

async function completeDuel(duelId, roomName, io) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;

    console.log(`🏁 Completing duel ${duelId}`);

    const finalResults = await duelSessionService.calculateFinalResults(
      session.sessionId,
    );

    if (finalResults) {
      await duelSessionService.completeDuelSession(
        session.sessionId,
        finalResults,
      );
      io.to(roomName).emit('duel_completed', finalResults);
    } else {
      console.error(`Could not calculate final results for duel ${duelId}`);
      io.to(roomName).emit('room_error', {
        message: 'Could not calculate final results.',
      });
    }

    botSessions.delete(duelId);
    setTimeout(() => {
      activeSessions.delete(duelId);
      console.log(`🧹 Cleaned up completed session for duel ${duelId}`);
    }, 60000);
  } catch (error) {
    console.error('Error completing duel:', error);
  }
}

module.exports = setupDuelSockets;

// =================== END: COMPLETE duelSocketHandler.js FILE ===================
