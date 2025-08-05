// services/botService.js - UPDATED with 60s timing
const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');
const duelModel = require('../models/duelModel');

const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

// ✅ CONSTANTS: Hard-coded 60 second timing for bots
const QUESTION_TIME_LIMIT = 60000; // 60 seconds in milliseconds
const BOT_MIN_THINKING_TIME = 3000; // 3 seconds minimum
const BOT_MAX_THINKING_TIME = 57000; // 57 seconds maximum (3 second buffer)

const botService = {
  // Get all available bots
  async getAvailableBots() {
    try {
      const { data: bots, error } = await supabase
        .from('bot_users')
        .select(
          `
          bot_id,
          user_id,
          bot_name,
          difficulty_level,
          accuracy_rate,
          avg_response_time_ms,
          bot_avatar,
          users(username)
        `,
        )
        .eq('is_active', true)
        .order('difficulty_level');

      if (error) throw error;

      return bots.map((bot) => ({
        botId: bot.bot_id,
        userId: bot.user_id,
        username: bot.users.username,
        botName: bot.bot_name,
        difficultyLevel: bot.difficulty_level,
        accuracyRate: bot.accuracy_rate,
        avgResponseTime: bot.avg_response_time_ms,
        avatar: bot.bot_avatar,
      }));
    } catch (error) {
      console.error('Error getting available bots:', error);
      throw error;
    }
  },

  // Get bot by difficulty level
  async getBotByDifficulty(difficultyLevel = 1) {
    try {
      const { data: bot, error } = await supabase
        .from('bot_users')
        .select(
          `
          bot_id,
          user_id,
          bot_name,
          difficulty_level,
          accuracy_rate,
          avg_response_time_ms,
          bot_avatar,
          users(username)
        `,
        )
        .eq('difficulty_level', difficultyLevel)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        botId: bot.bot_id,
        userId: bot.user_id,
        username: bot.users.username,
        botName: bot.bot_name,
        difficultyLevel: bot.difficulty_level,
        accuracyRate: bot.accuracy_rate,
        avgResponseTime: bot.avg_response_time_ms,
        avatar: bot.bot_avatar,
      };
    } catch (error) {
      console.error('Error getting bot by difficulty:', error);
      throw error;
    }
  },

  // Create a duel with a bot
  async createBotDuel(userId, testId = null, difficulty = 1, courseId = null) {
    try {
      // Get the bot for this difficulty
      const bot = await this.getBotByDifficulty(difficulty);
      if (!bot) {
        throw new Error(`No bot available for difficulty level ${difficulty}`);
      }

      // NEW: Create duel using either testId or courseId
      const newDuel = await duelModel.create(
        userId,
        bot.userId,
        testId, // Can be null for course-based duels
        5, // Updated from 3 to 5 questions
        'mixed',
        'random',
        null,
        courseId, // NEW: Pass courseId for course-based duels
      );

      // Auto-accept the duel since it's a bot
      const acceptedDuel = await duelModel.accept(newDuel.duel_id);

      return {
        ...acceptedDuel,
        opponent: {
          userId: bot.userId,
          username: bot.username,
          botName: bot.botName,
          isBot: true,
          avatar: bot.avatar,
          difficultyLevel: bot.difficultyLevel,
        },
      };
    } catch (error) {
      console.error('Error creating bot duel:', error);
      throw error;
    }
  },

  // NEW: Course-based bot duel method
  async createBotDuelWithCourse(userId, courseId, difficulty = 1) {
    try {
      return await this.createBotDuel(userId, null, difficulty, courseId);
    } catch (error) {
      console.error('Error creating course-based bot duel:', error);
      throw error;
    }
  },

  // Keep the original method for backward compatibility
  async createBotDuelLegacy(userId, testId, difficulty = 1) {
    try {
      return await this.createBotDuel(userId, testId, difficulty, null);
    } catch (error) {
      console.error('Error creating legacy bot duel:', error);
      throw error;
    }
  },

  // ✅ UPDATED: Simulate bot answering a question with 60s timing
  async simulateBotAnswer(
    botUserId,
    questionId,
    correctAnswer,
    sessionId,
    questionIndex,
  ) {
    try {
      // Get bot configuration
      const { data: bot, error } = await supabase
        .from('bot_users')
        .select('accuracy_rate, avg_response_time_ms, difficulty_level')
        .eq('user_id', botUserId)
        .single();

      if (error) throw error;

      // Simulate thinking time (with some randomness)
      const baseTime = bot.avg_response_time_ms;
      const randomFactor = 0.3; // ±30% variation
      const thinkingTime =
        baseTime + (Math.random() - 0.5) * 2 * randomFactor * baseTime;

      // ✅ USE 60s timing constants with buffer for question time limit
      const clampedTime = Math.max(
        BOT_MIN_THINKING_TIME, // 3 seconds minimum
        Math.min(BOT_MAX_THINKING_TIME, thinkingTime), // 57 seconds maximum
      );

      // Determine if bot answers correctly based on accuracy rate
      const willAnswerCorrectly = Math.random() < bot.accuracy_rate;

      let selectedAnswer;
      if (willAnswerCorrectly) {
        selectedAnswer = correctAnswer;
      } else {
        // Get question options to pick a wrong answer
        const { data: question, error: questionError } = await supabase
          .from('test_questions')
          .select('options')
          .eq('question_id', questionId)
          .single();

        if (questionError) throw questionError;

        const options = question.options;
        const wrongOptions = Object.keys(options).filter(
          (key) => key !== correctAnswer,
        );
        selectedAnswer =
          wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      }

      console.log(
        `🤖 Bot will answer in ${Math.floor(clampedTime / 1000)}s (${
          willAnswerCorrectly ? 'correct' : 'wrong'
        })`,
      );

      return {
        selectedAnswer,
        timeTaken: Math.round(clampedTime),
        isCorrect: selectedAnswer === correctAnswer,
        thinkingTime: clampedTime,
      };
    } catch (error) {
      console.error('Error simulating bot answer:', error);
      throw error;
    }
  },

  // Handle bot joining a duel room
  async handleBotJoinRoom(duelId, botUserId, io) {
    try {
      const roomName = `duel_${duelId}`;

      // Simulate bot joining with a slight delay
      setTimeout(() => {
        io.to(roomName).emit('opponent_joined', {
          username: 'Dr. Bot',
          isBot: true,
        });

        // Auto-ready the bot after a short delay
        setTimeout(() => {
          io.to(roomName).emit('player_ready', {
            userId: botUserId,
            username: 'Dr. Bot',
            isBot: true,
          });
        }, 1500);
      }, 1000);
    } catch (error) {
      console.error('Error handling bot join room:', error);
    }
  },

  // Handle bot answering during active duel
  async handleBotAnswerQuestion(
    duelId,
    botUserId,
    questionId,
    correctAnswer,
    sessionId,
    questionIndex,
    io,
  ) {
    try {
      const roomName = `duel_${duelId}`;

      // Simulate bot answer
      const botAnswer = await this.simulateBotAnswer(
        botUserId,
        questionId,
        correctAnswer,
        sessionId,
        questionIndex,
      );

      // Wait for the bot's thinking time
      setTimeout(async () => {
        // Notify that bot answered
        io.to(roomName).emit('opponent_answered', {
          userId: botUserId,
          username: 'Dr. Bot',
          isBot: true,
        });

        // Submit the bot's answer to the session service
        const duelSessionService = require('./duelSessionService');
        try {
          await duelSessionService.submitAnswer(
            sessionId,
            botUserId,
            questionId,
            botAnswer.selectedAnswer,
            botAnswer.timeTaken,
          );
        } catch (error) {
          console.error('Error submitting bot answer:', error);
        }
      }, botAnswer.thinkingTime);

      return botAnswer;
    } catch (error) {
      console.error('Error handling bot answer question:', error);
      throw error;
    }
  },

  // Check if a user is a bot
  async isBot(userId) {
    try {
      const { data: bot, error } = await supabase
        .from('bot_users')
        .select('bot_id')
        .eq('user_id', userId)
        .single();

      return !error && bot !== null;
    } catch (error) {
      return false;
    }
  },

  // Get bot info by user ID
  async getBotInfo(userId) {
    try {
      const { data: bot, error } = await supabase
        .from('bot_users')
        .select(
          `
          bot_id,
          bot_name,
          difficulty_level,
          accuracy_rate,
          avg_response_time_ms,
          bot_avatar
        `,
        )
        .eq('user_id', userId)
        .single();

      if (error) return null;

      return {
        botId: bot.bot_id,
        botName: bot.bot_name,
        difficultyLevel: bot.difficulty_level,
        accuracyRate: bot.accuracy_rate,
        avgResponseTime: bot.avg_response_time_ms,
        avatar: bot.bot_avatar,
      };
    } catch (error) {
      return null;
    }
  },

  // Update bot statistics after duels
  async updateBotStats(botUserId, won) {
    try {
      // For now, we'll just update the user stats like any other user
      // In the future, we could add bot-specific analytics
      const duelSessionService = require('./duelSessionService');
      await duelSessionService.updateUserStats(botUserId, won);
    } catch (error) {
      console.error('Error updating bot stats:', error);
    }
  },
};

module.exports = botService;
