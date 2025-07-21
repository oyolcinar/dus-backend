// sockets/duelSocketHandler.js - FIXED VERSION with better state management

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

// FIXED: Add better tracking for round processing
const roundProcessingState = new Map(); // duelId -> processing info

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

          // FIXED: Better bot session initialization
          botSessions.set(duelId, {
            botUserId: opponentId,
            humanUserId: socket.userId,
            humanSocketId: socket.id,
            botAnswered: false,
            humanAnswered: false,
            currentQuestionIndex: -1, // Start at -1 to track first question properly
            processingRound: false,
            lastQuestionId: null,
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

    // FIXED: Enhanced submit answer with better duplicate prevention
    socket.on('submit_answer', async (data) => {
      try {
        const { questionId, selectedAnswer, timeTaken } = data;
        const duelId = socket.currentDuelId;

        if (!duelId) return;

        const session = activeSessions.get(duelId);
        if (!session || session.status !== 'active') return;

        // FIXED: Check if this is a duplicate submission
        const processingInfo = roundProcessingState.get(duelId);
        if (processingInfo && processingInfo.processing) {
          console.log(
            `⚠️ Round already being processed for duel ${duelId}, ignoring duplicate answer`,
          );
          return;
        }

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

          // FIXED: Check and process round result with better synchronization
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
          // FIXED: Also clean up round processing state
          roundProcessingState.delete(duelId);

          // If session becomes empty, clean it up after delay
          if (session.connectedUsers.size === 0) {
            setTimeout(() => {
              const currentSession = activeSessions.get(duelId);
              if (currentSession && currentSession.connectedUsers.size === 0) {
                activeSessions.delete(duelId);
                roundProcessingState.delete(duelId);
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

    // FIXED: Initialize round processing state
    roundProcessingState.set(duelId, {
      processing: false,
      currentQuestionId: null,
      lastProcessedIndex: -1,
    });

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

// FIXED: Enhanced helper function to present next question with better state management
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

    // FIXED: Update round processing state to prevent duplicate processing
    const processingInfo = roundProcessingState.get(duelId);
    if (processingInfo) {
      processingInfo.processing = false;
      processingInfo.currentQuestionId = currentQuestion.question_id;
      processingInfo.lastProcessedIndex = session.currentQuestionIndex;
      roundProcessingState.set(duelId, processingInfo);
    }

    console.log(
      `📝 Presenting question ${session.currentQuestionIndex + 1}/${
        session.questions.length
      } for duel ${duelId} (Question ID: ${currentQuestion.question_id})`,
    );

    // FIXED: Reset bot session state for new question more thoroughly
    const botSessionInfo = botSessions.get(duelId);
    if (botSessionInfo) {
      botSessionInfo.botAnswered = false;
      botSessionInfo.humanAnswered = false;
      botSessionInfo.processingRound = false;
      botSessionInfo.currentQuestionIndex = session.currentQuestionIndex;
      botSessionInfo.lastQuestionId = currentQuestion.question_id;
      botSessions.set(duelId, botSessionInfo);
    }

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

    // Handle bot answers if there are bots in the duel
    if (botInfo.isInitiatorBot) {
      console.log(
        `🤖 Triggering bot answer for initiator ${botInfo.duel.initiator_id}`,
      );
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
      handleBotAnswer(
        duelId,
        botInfo.duel.opponent_id,
        currentQuestion,
        session,
        io,
      );
    }

    // THIS IS THE CORRECTED TIMEOUT LOGIC
    setTimeout(async () => {
      const currentSession = activeSessions.get(duelId);
      const botSessionInfo = botSessions.get(duelId);

      if (
        currentSession &&
        botSessionInfo &&
        currentSession.currentQuestionIndex === session.currentQuestionIndex &&
        !botSessionInfo.processingRound // Only run if not already processed
      ) {
        console.log(
          `⏰ Time limit reached for question ${
            session.currentQuestionIndex + 1
          } in duel ${duelId}`,
        );

        // Submit a timeout answer for any player who hasn't answered
        await duelSessionService.autoSubmitUnanswered(
          session.sessionId,
          session.currentQuestionIndex,
        );

        // Mark both as "answered" to satisfy the gatekeeper condition
        botSessionInfo.humanAnswered = true;
        botSessionInfo.botAnswered = true;
        botSessions.set(duelId, botSessionInfo);

        // NOW, call the synchronized gatekeeper function, just like the other handlers
        console.log(
          `⏰ Timeout triggering round result check for duel ${duelId}`,
        );
        await checkAndProcessRoundResult(duelId, currentSession, io);
      }
    }, 30000);
  } catch (error) {
    console.error('Error presenting question:', error);
  }
}

// FIXED: Enhanced bot answer handling with better error recovery
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

    // FIXED: Store timeout reference for cleanup
    const botTimeout = setTimeout(async () => {
      try {
        // Double-check the question is still current
        const currentSession = activeSessions.get(duelId);
        const botSessionInfo = botSessions.get(duelId);

        if (!currentSession || !botSessionInfo) {
          console.log(
            `🤖 Session or bot info not found for duel ${duelId}, aborting bot answer`,
          );
          return;
        }

        // Check if this is still the correct question
        if (botSessionInfo.lastQuestionId !== currentQuestion.question_id) {
          console.log(
            `🤖 Question changed for duel ${duelId}, aborting stale bot answer`,
          );
          return;
        }

        // Check if bot already answered
        if (botSessionInfo.botAnswered) {
          console.log(
            `🤖 Bot already answered for duel ${duelId}, skipping duplicate`,
          );
          return;
        }

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
        botSessionInfo.botAnswered = true;
        botSessions.set(duelId, botSessionInfo);

        // Check if both players have answered
        await checkAndProcessRoundResult(duelId, currentSession, io);
      } catch (error) {
        console.error('Error in bot answer callback:', error);
        // FIXED: Fallback - mark as answered to prevent hanging
        const botSessionInfo = botSessions.get(duelId);
        if (botSessionInfo && !botSessionInfo.botAnswered) {
          botSessionInfo.botAnswered = true;
          botSessions.set(duelId, botSessionInfo);
          const currentSession = activeSessions.get(duelId);
          if (currentSession) {
            await checkAndProcessRoundResult(duelId, currentSession, io);
          }
        }
      }
    }, botAnswer.thinkingTime);

    // Store timeout reference for potential cleanup
    const botSessionInfo = botSessions.get(duelId);
    if (botSessionInfo) {
      botSessionInfo.botTimeout = botTimeout;
      botSessions.set(duelId, botSessionInfo);
    }
  } catch (error) {
    console.error('Error handling bot answer:', error);
    // FIXED: Fallback - mark as answered to prevent hanging
    const botSessionInfo = botSessions.get(duelId);
    if (botSessionInfo && !botSessionInfo.botAnswered) {
      botSessionInfo.botAnswered = true;
      botSessions.set(duelId, botSessionInfo);
      const currentSession = activeSessions.get(duelId);
      if (currentSession) {
        await checkAndProcessRoundResult(duelId, currentSession, io);
      }
    }
  }
}

// FIXED: Enhanced function to check and process round result with better synchronization
async function checkAndProcessRoundResult(duelId, session, io) {
  try {
    const botSessionInfo = botSessions.get(duelId);
    const processingInfo = roundProcessingState.get(duelId);

    if (!botSessionInfo || !processingInfo) return;

    // FIXED: Prevent duplicate processing with multiple checks
    if (processingInfo.processing || botSessionInfo.processingRound) {
      console.log(`🔄 Round result already being processed for duel ${duelId}`);
      return;
    }

    // Check if both players have answered for the current question
    if (botSessionInfo.botAnswered && botSessionInfo.humanAnswered) {
      console.log(
        `🎯 Both players have answered question ${
          session.currentQuestionIndex + 1
        } in duel ${duelId}`,
      );

      // Mark as processing to prevent duplicate calls
      processingInfo.processing = true;
      botSessionInfo.processingRound = true;
      roundProcessingState.set(duelId, processingInfo);
      botSessions.set(duelId, botSessionInfo);

      await processRoundResult(duelId, session, io);
    } else {
      console.log(`🤔 Waiting for more answers in duel ${duelId}:`, {
        botAnswered: botSessionInfo.botAnswered,
        humanAnswered: botSessionInfo.humanAnswered,
      });
    }
  } catch (error) {
    console.error('Error checking and processing round result:', error);
    // FIXED: Reset processing flags on error
    const botSessionInfo = botSessions.get(duelId);
    const processingInfo = roundProcessingState.get(duelId);
    if (botSessionInfo) {
      botSessionInfo.processingRound = false;
      botSessions.set(duelId, botSessionInfo);
    }
    if (processingInfo) {
      processingInfo.processing = false;
      roundProcessingState.set(duelId, processingInfo);
    }
  }
}

// FIXED: Enhanced function to process round results with better error handling
// A new, cleaner, and correct implementation of processRoundResult
async function processRoundResult(duelId, session, io) {
  try {
    const roomName = `duel_${duelId}`;

    // 1. GET AND SEND RESULTS for the round that just finished.
    const roundResults = await duelSessionService.getRoundResults(
      session.sessionId,
      session.currentQuestionIndex,
    );

    console.log(
      `📊 Sending round results for duel ${duelId}, question index ${session.currentQuestionIndex}`,
    );
    io.to(roomName).emit('round_result', roundResults);

    // 2. ATOMICALLY ADVANCE THE STATE for the next round.
    session.currentQuestionIndex += 1;
    activeSessions.set(duelId, session);

    // 3. DECIDE what to do based on the NEW state.
    const isDuelOver = session.currentQuestionIndex >= session.questions.length;

    if (isDuelOver) {
      // --- PATH A: Duel is over ---
      console.log(
        `✅ All questions answered. Completing duel ${duelId} in 3s.`,
      );
      setTimeout(async () => {
        await completeDuel(duelId, roomName, io);
      }, 3000);
    } else {
      // --- PATH B: More questions to go ---
      console.log(
        `⏳ Scheduling next question (${session.currentQuestionIndex}) for duel ${duelId} in 3s`,
      );
      setTimeout(async () => {
        const currentSession = activeSessions.get(duelId);
        if (currentSession) {
          // Get duel and bot info for the next question
          const duel = await duelSessionService.getDuelById(duelId);
          const isInitiatorBot = await botService.isBot(duel.initiator_id);
          const isOpponentBot = await botService.isBot(duel.opponent_id);

          // Present the next question
          await presentNextQuestion(duelId, roomName, io, {
            isInitiatorBot,
            isOpponentBot,
            duel,
          });
        }
      }, 3000);
    }
  } catch (error) {
    console.error('Error processing round result:', error);
    const roomName = `duel_${duelId}`;
    io.to(roomName).emit('room_error', {
      message: 'Error processing round result.',
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

    // Clean up all related state
    botSessions.delete(duelId);
    roundProcessingState.delete(duelId);

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
