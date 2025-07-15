// sockets/duelSocketHandler.js
const jwt = require('jsonwebtoken');
const duelSessionService = require('../services/duelSessionService');
const botService = require('../services/botService');

// In-memory store for active duel sessions (use Redis in production)
const activeSessions = new Map();
const userSockets = new Map(); // userId -> socketId

const setupDuelSockets = (io) => {
  // Middleware for socket authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(
      `User ${socket.userId} (${socket.username}) connected: ${socket.id}`,
    );

    // Store user socket mapping
    userSockets.set(socket.userId, socket.id);

    // Join duel room
    socket.on('join_duel_room', async (data) => {
      try {
        const { duelId } = data;
        const roomName = `duel_${duelId}`;

        // Verify user is part of this duel
        const duel = await duelSessionService.getDuelById(duelId);
        if (
          !duel ||
          (duel.initiator_id !== socket.userId &&
            duel.opponent_id !== socket.userId)
        ) {
          socket.emit('room_error', {
            message: 'Unauthorized to join this duel',
          });
          return;
        }

        // Check if duel is active
        if (duel.status !== 'active') {
          socket.emit('room_error', { message: 'Duel is not active' });
          return;
        }

        // Join the room
        socket.join(roomName);
        socket.currentDuelId = duelId;

        // Get or create session
        let session = activeSessions.get(duelId);
        if (!session) {
          session = await duelSessionService.createSession(duel);
          activeSessions.set(duelId, session);
        }

        // Add user to session
        session.connectedUsers.set(socket.userId, {
          socketId: socket.id,
          username: socket.username,
          ready: false,
          connectedAt: new Date(),
        });

        socket.emit('room_joined', {
          session: {
            sessionId: session.sessionId,
            duelId: session.duelId,
            status: session.status,
            connectedUsers: Array.from(session.connectedUsers.values()).map(
              (user) => ({
                username: user.username,
                ready: user.ready,
              }),
            ),
          },
        });

        // Notify opponent that user joined
        const opponentId =
          duel.initiator_id === socket.userId
            ? duel.opponent_id
            : duel.initiator_id;
        const opponentSocketId = userSockets.get(opponentId);
        if (opponentSocketId) {
          io.to(opponentSocketId).emit('opponent_joined', {
            username: socket.username,
          });
        }

        // If both users are connected, check if we can start
        if (session.connectedUsers.size === 2) {
          io.to(roomName).emit('both_players_connected');
        }
      } catch (error) {
        console.error('Error joining duel room:', error);
        socket.emit('room_error', { message: 'Failed to join duel room' });
      }
    });

    // Signal ready to start duel
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

        // Check if both players are ready
        const allReady = Array.from(session.connectedUsers.values()).every(
          (user) => user.ready,
        );

        if (allReady && session.connectedUsers.size === 2) {
          // Start the duel countdown
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
      } catch (error) {
        console.error('Error setting ready status:', error);
      }
    });

    // Submit answer
    socket.on('submit_answer', async (data) => {
      try {
        const { questionId, selectedAnswer, timeTaken } = data;
        const duelId = socket.currentDuelId;

        if (!duelId) return;

        const session = activeSessions.get(duelId);
        if (!session || session.status !== 'active') return;

        // Record the answer
        const answerResult = await duelSessionService.submitAnswer(
          session.sessionId,
          socket.userId,
          questionId,
          selectedAnswer,
          timeTaken,
        );

        const roomName = `duel_${duelId}`;

        // Notify opponent that this user answered
        io.to(roomName).emit('opponent_answered', {
          userId: socket.userId,
          username: socket.username,
        });

        // Check if both players have answered this question
        const bothAnswered = await duelSessionService.checkBothAnswered(
          session.sessionId,
          session.currentQuestionIndex,
        );

        if (bothAnswered) {
          // Get results for this round
          const roundResults = await duelSessionService.getRoundResults(
            session.sessionId,
            session.currentQuestionIndex,
          );

          // Send round results to both players
          io.to(roomName).emit('round_result', roundResults);

          // Move to next question or end duel
          if (session.currentQuestionIndex + 1 < session.questions.length) {
            // Next question
            setTimeout(async () => {
              session.currentQuestionIndex += 1;
              activeSessions.set(duelId, session);
              await presentNextQuestion(duelId, roomName, io);
            }, 3000); // 3-second delay before next question
          } else {
            // Duel completed
            setTimeout(async () => {
              await completeDuel(duelId, roomName, io);
            }, 3000);
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

        // Create duel with bot
        const botDuel = await botService.createBotDuel(
          socket.userId,
          testId,
          difficulty,
        );

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

    // Handle bot logic during duel
    socket.on('bot_join_room', async (data) => {
      try {
        const { duelId, botUserId } = data;
        await botService.handleBotJoinRoom(duelId, botUserId, io);
      } catch (error) {
        console.error('Error handling bot join room:', error);
      }
    });

    socket.on('bot_answer_question', async (data) => {
      try {
        const {
          duelId,
          botUserId,
          questionId,
          correctAnswer,
          sessionId,
          questionIndex,
        } = data;
        await botService.handleBotAnswerQuestion(
          duelId,
          botUserId,
          questionId,
          correctAnswer,
          sessionId,
          questionIndex,
          io,
        );
      } catch (error) {
        console.error('Error handling bot answer:', error);
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

// Helper function to start duel session
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

    // Check if there's a bot in this duel
    const duel = await duelSessionService.getDuelById(duelId);
    const isInitiatorBot = await botService.isBot(duel.initiator_id);
    const isOpponentBot = await botService.isBot(duel.opponent_id);

    // Present first question
    await presentNextQuestion(duelId, roomName, io, {
      isInitiatorBot,
      isOpponentBot,
    });
  } catch (error) {
    console.error('Error starting duel session:', error);
  }
}

// Helper function to present next question
async function presentNextQuestion(duelId, roomName, io, botInfo = {}) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;

    const currentQuestion = session.questions[session.currentQuestionIndex];

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
    const duel = await duelSessionService.getDuelById(duelId);

    if (botInfo.isInitiatorBot) {
      setTimeout(async () => {
        await botService.handleBotAnswerQuestion(
          duelId,
          duel.initiator_id,
          currentQuestion.question_id,
          currentQuestion.correct_answer,
          session.sessionId,
          session.currentQuestionIndex,
          io,
        );
      }, 500); // Small delay to ensure question is presented first
    }

    if (botInfo.isOpponentBot) {
      setTimeout(async () => {
        await botService.handleBotAnswerQuestion(
          duelId,
          duel.opponent_id,
          currentQuestion.question_id,
          currentQuestion.correct_answer,
          session.sessionId,
          session.currentQuestionIndex,
          io,
        );
      }, 500);
    }

    // Auto-submit for unanswered questions after time limit
    setTimeout(async () => {
      const currentSession = activeSessions.get(duelId);
      if (
        currentSession &&
        currentSession.currentQuestionIndex === session.currentQuestionIndex
      ) {
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
          const roundResults = await duelSessionService.getRoundResults(
            session.sessionId,
            session.currentQuestionIndex,
          );

          io.to(roomName).emit('round_result', roundResults);

          if (session.currentQuestionIndex + 1 < session.questions.length) {
            setTimeout(async () => {
              currentSession.currentQuestionIndex += 1;
              activeSessions.set(duelId, currentSession);
              await presentNextQuestion(duelId, roomName, io, botInfo);
            }, 3000);
          } else {
            setTimeout(async () => {
              await completeDuel(duelId, roomName, io);
            }, 3000);
          }
        }
      }
    }, 30000); // 30-second timer
  } catch (error) {
    console.error('Error presenting question:', error);
  }
}

// Helper function to complete duel
async function completeDuel(duelId, roomName, io) {
  try {
    const session = activeSessions.get(duelId);
    if (!session) return;

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

    // Clean up session after a delay
    setTimeout(() => {
      activeSessions.delete(duelId);
    }, 60000); // Keep for 1 minute for reconnections
  } catch (error) {
    console.error('Error completing duel:', error);
  }
}

module.exports = setupDuelSockets;
