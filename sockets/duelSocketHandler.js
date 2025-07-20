// sockets/duelSocketHandler.js - FIXED VERSION with proper bot game logic

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

      console.log('🔧 Socket Auth: Token received, verifying with Supabase...');

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

      console.log(
        '🔧 Socket Auth: Supabase token verified for user:',
        user.email,
      );

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

        console.log('🔧 Socket Auth: Database user found:', {
          userId: dbUser.user_id,
          username: dbUser.username,
          email: dbUser.email,
        });

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
          socket.emit('room_error', {
            message: 'Unauthorized to join this duel',
          });
          return;
        }

        // Check if duel is active
        if (duel.status !== 'active') {
          console.log(
            `🔧 Socket: Duel ${duelId} is not active (status: ${duel.status})`,
          );
          socket.emit('room_error', { message: 'Duel is not active' });
          return;
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

        // Enhanced session response with bot info
        const sessionResponse = {
          sessionId: session.sessionId,
          duelId: session.duelId,
          status: session.status,
          connectedUsers: Array.from(session.connectedUsers.values()).map(
            (user) => ({
              username: user.username,
              ready: user.ready,
            }),
          ),
          isBot: isOpponentBot,
          opponentId: opponentId,
        };

        socket.emit('room_joined', { session: sessionResponse });

        if (isOpponentBot) {
          console.log('🤖 Bot game detected, initializing bot behavior...');

          // Store bot session info
          botSessions.set(duelId, {
            botUserId: opponentId,
            humanUserId: socket.userId,
            humanSocketId: socket.id,
            botAnswered: false,
            humanAnswered: false,
            currentQuestionIndex: 0,
            // FIXED: Add pending operations tracking
            pendingRoundResult: false,
          });

          // Handle bot joining room
          await botService.handleBotJoinRoom(duelId, opponentId, io);

          // Add bot to session as connected
          const botInfo = await botService.getBotInfo(opponentId);
          session.connectedUsers.set(opponentId, {
            socketId: 'bot-' + opponentId,
            username: botInfo?.botName || 'Dr. Bot',
            ready: false,
            connectedAt: new Date(),
            isBot: true,
          });

          activeSessions.set(duelId, session);

          // Auto-trigger both players connected for bot games
          setTimeout(() => {
            io.to(roomName).emit('both_players_connected');
            console.log(
              `🔧 Socket: Both players connected for bot duel ${duelId}`,
            );
          }, 1500);
        } else {
          // Human vs Human - notify opponent that user joined
          const opponentSocketId = userSockets.get(opponentId);
          if (opponentSocketId) {
            io.to(opponentSocketId).emit('opponent_joined', {
              username: socket.username,
            });
            console.log(
              `🔧 Socket: Notified opponent ${opponentId} that ${socket.username} joined`,
            );
          }

          // If both users are connected, check if we can start
          if (session.connectedUsers.size === 2) {
            io.to(roomName).emit('both_players_connected');
            console.log(`🔧 Socket: Both players connected for duel ${duelId}`);
          }
        }
      } catch (error) {
        console.error('Error joining duel room:', error);
        socket.emit('room_error', { message: 'Failed to join duel room' });
      }
    });

    // Enhanced ready signal with bot game handling
    socket.on('ready_for_duel', async () => {
      try {
        const duelId = socket.currentDuelId;
        if (!duelId) return;

        const session = activeSessions.get(duelId);
        if (!session) return;

        // Mark user as ready
        const user = session.connectedUsers.get(socket.userId);
        if (user) {
          user.ready = true;
        }

        const roomName = `duel_${duelId}`;
        io.to(roomName).emit('player_ready', {
          userId: socket.userId,
          username: socket.username,
        });

        console.log(`✅ Player ${socket.username} ready in duel ${duelId}`);

        // Check if this is a bot game
        const botSessionInfo = botSessions.get(duelId);
        if (botSessionInfo) {
          console.log('🤖 Bot game detected, auto-starting countdown...');

          // Mark bot as ready automatically
          const botUser = session.connectedUsers.get(botSessionInfo.botUserId);
          if (botUser) {
            botUser.ready = true;
          }

          // Emit bot ready event
          io.to(roomName).emit('player_ready', {
            userId: botSessionInfo.botUserId,
            username: botUser?.username || 'Dr. Bot',
            isBot: true,
          });

          // Start the duel countdown immediately for bot games
          session.status = 'starting';
          activeSessions.set(duelId, session);

          // 3-second countdown
          let countdown = 3;
          io.to(roomName).emit('duel_starting', { countdown });

          const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
              io.to(roomName).emit('duel_starting', { countdown });
            } else {
              clearInterval(countdownInterval);
              // Start the actual duel
              startDuelSession(duelId, roomName, io);
            }
          }, 1000);
        } else {
          // Human vs Human - check if both players are ready
          const allReady = Array.from(session.connectedUsers.values()).every(
            (user) => user.ready,
          );

          if (allReady && session.connectedUsers.size === 2) {
            // Start the duel countdown for human vs human
            session.status = 'starting';
            activeSessions.set(duelId, session);

            // 3-second countdown
            io.to(roomName).emit('duel_starting', { countdown: 3 });

            setTimeout(() => {
              io.to(roomName).emit('duel_starting', { countdown: 2 });
            }, 1000);

            setTimeout(() => {
              io.to(roomName).emit('duel_starting', { countdown: 1 });
            }, 2000);

            setTimeout(async () => {
              // Start the actual duel
              await startDuelSession(duelId, roomName, io);
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Error setting ready status:', error);
      }
    });

    // FIXED: Enhanced submit answer with proper bot handling
    socket.on('submit_answer', async (data) => {
      try {
        const { questionId, selectedAnswer, timeTaken } = data;
        const duelId = socket.currentDuelId;

        if (!duelId) return;

        const session = activeSessions.get(duelId);
        if (!session || session.status !== 'active') return;

        console.log(
          `📝 User ${socket.username} submitted answer for question ${questionId}: ${selectedAnswer} (${timeTaken}ms)`,
        );

        // Record the answer
        const answerResult = await duelSessionService.submitAnswer(
          session.sessionId,
          socket.userId,
          questionId,
          selectedAnswer,
          timeTaken,
        );

        const roomName = `duel_${duelId}`;

        // Notify that this user answered
        io.to(roomName).emit('opponent_answered', {
          userId: socket.userId,
          username: socket.username,
        });

        // Check if this is a bot game
        const botSessionInfo = botSessions.get(duelId);
        if (botSessionInfo) {
          console.log(`🤖 Bot game detected, marking human as answered...`);
          botSessionInfo.humanAnswered = true;
          botSessions.set(duelId, botSessionInfo);

          // FIXED: Check and process round result immediately if bot already answered
          await checkAndProcessRoundResult(duelId, session, io);
        } else {
          // Human vs Human - original logic
          const bothAnswered = await duelSessionService.checkBothAnswered(
            session.sessionId,
            session.currentQuestionIndex,
          );

          if (bothAnswered) {
            await processRoundResult(duelId, session, io);
          }
        }
      } catch (error) {
        console.error('Error submitting answer:', error);
        socket.emit('answer_error', { message: 'Failed to submit answer' });
      }
    });

    // Challenge bot
    socket.on('challenge_bot', async (data) => {
      try {
        const { testId, difficulty = 1 } = data;

        console.log(
          `🤖 User ${socket.username} challenging bot with difficulty ${difficulty} for test ${testId}`,
        );

        // Create duel with bot
        const botDuel = await botService.createBotDuel(
          socket.userId,
          testId,
          difficulty,
        );

        console.log(`🤖 Bot duel created with ID: ${botDuel.duel_id}`);

        socket.emit('bot_challenge_created', {
          duel: botDuel,
        });

        // Auto-join the bot duel room
        setTimeout(() => {
          socket.emit('auto_join_duel', { duelId: botDuel.duel_id });
        }, 1000);
      } catch (error) {
        console.error('Error challenging bot:', error);
        socket.emit('bot_challenge_error', {
          message: 'Failed to create bot challenge',
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected: ${socket.id}`);

      // Remove from user sockets mapping
      userSockets.delete(socket.userId);

      // Handle duel session disconnection
      const duelId = socket.currentDuelId;
      if (duelId) {
        const session = activeSessions.get(duelId);
        if (session) {
          session.connectedUsers.delete(socket.userId);

          const roomName = `duel_${duelId}`;
          // Notify opponent of disconnection
          io.to(roomName).emit('opponent_disconnected', {
            userId: socket.userId,
            username: socket.username,
          });

          // Clean up bot session if exists
          botSessions.delete(duelId);

          // If session becomes empty, clean it up after delay
          if (session.connectedUsers.size === 0) {
            setTimeout(() => {
              const currentSession = activeSessions.get(duelId);
              if (currentSession && currentSession.connectedUsers.size === 0) {
                activeSessions.delete(duelId);
                console.log(`Cleaned up empty session for duel ${duelId}`);
              }
            }, 30000); // 30-second grace period
          }
        }
      }
    });
  });
};

// Enhanced helper function to start duel session
async function startDuelSession(duelId, roomName, io) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;

    session.status = 'active';
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;

    // Get questions for this duel
    session.questions = await duelSessionService.getQuestionsForDuel(
      session.duelId,
    );
    activeSessions.set(duelId, session);

    console.log(
      `🎮 Starting duel session ${duelId} with ${session.questions.length} questions`,
    );

    // Check if there's a bot in this duel
    const duel = await duelSessionService.getDuelById(duelId);
    const isInitiatorBot = await botService.isBot(duel.initiator_id);
    const isOpponentBot = await botService.isBot(duel.opponent_id);

    console.log(
      `🔍 Duel ${duelId} bot status: Initiator bot: ${isInitiatorBot}, Opponent bot: ${isOpponentBot}`,
    );

    // Present first question
    await presentNextQuestion(duelId, roomName, io, {
      isInitiatorBot,
      isOpponentBot,
      duel,
    });
  } catch (error) {
    console.error('Error starting duel session:', error);
  }
}

// Enhanced helper function to present next question
async function presentNextQuestion(duelId, roomName, io, botInfo = {}) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;

    if (session.currentQuestionIndex >= session.questions.length) {
      // All questions completed, end duel
      await completeDuel(duelId, roomName, io);
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];

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
      timeLimit: 30000, // 30 seconds
    });

    // FIXED: Reset bot session state for new question
    const botSessionInfo = botSessions.get(duelId);
    if (botSessionInfo) {
      botSessionInfo.botAnswered = false;
      botSessionInfo.humanAnswered = false;
      botSessionInfo.pendingRoundResult = false;
      botSessions.set(duelId, botSessionInfo);
    }

    // Handle bot answers if there are bots in the duel
    if (botInfo.isInitiatorBot) {
      console.log(
        `🤖 Triggering bot answer for initiator ${botInfo.duel.initiator_id}`,
      );
      // FIXED: No delay - start bot answer immediately
      handleBotAnswer(
        duelId,
        botInfo.duel.initiator_id,
        currentQuestion,
        session,
        io,
      );
    }

    if (botInfo.isOpponentBot) {
      console.log(
        `🤖 Triggering bot answer for opponent ${botInfo.duel.opponent_id}`,
      );
      // FIXED: No delay - start bot answer immediately
      handleBotAnswer(
        duelId,
        botInfo.duel.opponent_id,
        currentQuestion,
        session,
        io,
      );
    }

    // Auto-submit for unanswered questions after time limit
    setTimeout(async () => {
      const currentSession = activeSessions.get(duelId);
      if (
        currentSession &&
        currentSession.currentQuestionIndex === session.currentQuestionIndex
      ) {
        console.log(
          `⏰ Time limit reached for question ${
            session.currentQuestionIndex + 1
          } in duel ${duelId}`,
        );

        await duelSessionService.autoSubmitUnanswered(
          session.sessionId,
          session.currentQuestionIndex,
        );

        // Check if we can proceed (both answered or timed out)
        const bothCompleted = await duelSessionService.checkBothCompleted(
          session.sessionId,
          session.currentQuestionIndex,
        );

        if (bothCompleted) {
          await processRoundResult(duelId, currentSession, io);
        }
      }
    }, 30000); // 30-second timer
  } catch (error) {
    console.error('Error presenting question:', error);
  }
}

// FIXED: New helper function to handle bot answers with proper callback
async function handleBotAnswer(
  duelId,
  botUserId,
  currentQuestion,
  session,
  io,
) {
  try {
    const roomName = `duel_${duelId}`;

    // Get bot answer simulation
    const botAnswer = await botService.simulateBotAnswer(
      botUserId,
      currentQuestion.question_id,
      currentQuestion.correct_answer,
      session.sessionId,
      session.currentQuestionIndex,
    );

    const botInfo = await botService.getBotInfo(botUserId);
    const botName = botInfo?.botName || 'Dr. Bot';

    console.log(`🤖 Bot ${botName} will answer in ${botAnswer.thinkingTime}ms`);

    // Wait for the bot's thinking time
    setTimeout(async () => {
      try {
        // Notify that bot answered
        io.to(roomName).emit('opponent_answered', {
          userId: botUserId,
          username: botName,
          isBot: true,
        });

        console.log(
          `🤖 Bot ${botName} answered: ${botAnswer.selectedAnswer} (${
            botAnswer.isCorrect ? 'Correct' : 'Wrong'
          })`,
        );

        // Submit the bot's answer to the session
        await duelSessionService.submitAnswer(
          session.sessionId,
          botUserId,
          currentQuestion.question_id,
          botAnswer.selectedAnswer,
          botAnswer.timeTaken,
        );

        // FIXED: Mark bot as answered and check for round result
        const botSessionInfo = botSessions.get(duelId);
        if (botSessionInfo) {
          botSessionInfo.botAnswered = true;
          botSessions.set(duelId, botSessionInfo);

          // Check if both players have answered
          await checkAndProcessRoundResult(duelId, session, io);
        }
      } catch (error) {
        console.error('Error in bot answer callback:', error);
        // FIXED: If bot answer fails, still try to proceed
        const botSessionInfo = botSessions.get(duelId);
        if (botSessionInfo) {
          botSessionInfo.botAnswered = true; // Mark as answered to prevent hanging
          botSessions.set(duelId, botSessionInfo);
          await checkAndProcessRoundResult(duelId, session, io);
        }
      }
    }, botAnswer.thinkingTime);
  } catch (error) {
    console.error('Error handling bot answer:', error);
    // FIXED: If bot setup fails, mark as answered to prevent hanging
    const botSessionInfo = botSessions.get(duelId);
    if (botSessionInfo) {
      botSessionInfo.botAnswered = true;
      botSessions.set(duelId, botSessionInfo);
      await checkAndProcessRoundResult(duelId, session, io);
    }
  }
}

// FIXED: New function to check and process round result
async function checkAndProcessRoundResult(duelId, session, io) {
  try {
    const botSessionInfo = botSessions.get(duelId);
    if (!botSessionInfo) return;

    // Prevent duplicate processing
    if (botSessionInfo.pendingRoundResult) {
      console.log(`🔄 Round result already being processed for duel ${duelId}`);
      return;
    }

    // Check if both players have answered
    if (botSessionInfo.botAnswered && botSessionInfo.humanAnswered) {
      console.log(
        `🎯 Both players have answered question ${
          session.currentQuestionIndex + 1
        } in duel ${duelId}`,
      );

      // Mark as pending to prevent duplicate processing
      botSessionInfo.pendingRoundResult = true;
      botSessions.set(duelId, botSessionInfo);

      await processRoundResult(duelId, session, io);
    }
  } catch (error) {
    console.error('Error checking and processing round result:', error);
  }
}

// FIXED: New centralized function to process round results
async function processRoundResult(duelId, session, io) {
  try {
    const roomName = `duel_${duelId}`;

    // Get results for this round
    const roundResults = await duelSessionService.getRoundResults(
      session.sessionId,
      session.currentQuestionIndex,
    );

    console.log(`📊 Sending round results for duel ${duelId}:`, {
      questionIndex: roundResults.questionIndex,
      correctAnswer: roundResults.question.correctAnswer,
      answers: roundResults.answers.map((a) => ({
        userId: a.userId,
        isCorrect: a.isCorrect,
        selectedAnswer: a.selectedAnswer,
      })),
    });

    // Send round results to both players
    io.to(roomName).emit('round_result', roundResults);

    // Move to next question or end duel
    if (session.currentQuestionIndex + 1 < session.questions.length) {
      // Next question
      setTimeout(async () => {
        const currentSession = activeSessions.get(duelId);
        if (currentSession) {
          currentSession.currentQuestionIndex += 1;
          activeSessions.set(duelId, currentSession);

          // Get duel info for bot handling
          const duel = await duelSessionService.getDuelById(duelId);
          const isInitiatorBot = await botService.isBot(duel.initiator_id);
          const isOpponentBot = await botService.isBot(duel.opponent_id);

          await presentNextQuestion(duelId, roomName, io, {
            isInitiatorBot,
            isOpponentBot,
            duel,
          });
        }
      }, 3000); // 3-second delay before next question
    } else {
      // Duel completed
      setTimeout(async () => {
        await completeDuel(duelId, roomName, io);
      }, 3000);
    }
  } catch (error) {
    console.error('Error processing round result:', error);
    // FIXED: If round result fails, still try to continue
    const roomName = `duel_${duelId}`;
    io.to(roomName).emit('room_error', {
      message: 'Error processing round result',
    });
  }
}

// Helper function to complete duel
async function completeDuel(duelId, roomName, io) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;

    console.log(`🏁 Completing duel ${duelId}`);

    // Calculate final results
    const finalResults = await duelSessionService.calculateFinalResults(
      session.sessionId,
    );

    // Update duel status and create duel result
    await duelSessionService.completeDuelSession(
      session.sessionId,
      finalResults,
    );

    // Send final results to both players
    io.to(roomName).emit('duel_completed', finalResults);

    // Clean up bot session
    botSessions.delete(duelId);

    // Clean up session after a delay
    setTimeout(() => {
      activeSessions.delete(duelId);
      console.log(`🧹 Cleaned up session for completed duel ${duelId}`);
    }, 60000); // Keep for 1 minute for reconnections
  } catch (error) {
    console.error('Error completing duel:', error);
  }
}

module.exports = setupDuelSockets;
