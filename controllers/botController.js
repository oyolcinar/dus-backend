// controllers/botController.js
const botService = require('../services/botService');

const botController = {
  // Get all available bots
  async getAvailableBots(req, res) {
    try {
      const { limit = 10, difficulty } = req.query;

      let bots = await botService.getAvailableBots();

      // Filter by difficulty if specified
      if (difficulty) {
        const difficultyLevel = parseInt(difficulty);
        if (difficultyLevel >= 1 && difficultyLevel <= 5) {
          bots = bots.filter((bot) => bot.difficultyLevel === difficultyLevel);
        }
      }

      // Apply limit
      if (limit && limit > 0) {
        bots = bots.slice(0, parseInt(limit));
      }

      res.status(200).json({
        success: true,
        data: bots,
        count: bots.length,
      });
    } catch (error) {
      console.error('Error getting available bots:', error);
      res.status(500).json({
        success: false,
        message: 'Botlar yüklenirken hata oluştu',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Get bot by difficulty level
  async getBotByDifficulty(req, res) {
    try {
      const { level } = req.params;
      const difficultyLevel = parseInt(level);

      if (!difficultyLevel || difficultyLevel < 1 || difficultyLevel > 5) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz zorluk seviyesi (1-5 arası olmalı)',
        });
      }

      const bot = await botService.getBotByDifficulty(difficultyLevel);

      if (!bot) {
        return res.status(404).json({
          success: false,
          message: `Seviye ${difficultyLevel} için bot bulunamadı`,
        });
      }

      res.status(200).json({
        success: true,
        data: bot,
      });
    } catch (error) {
      console.error('Error getting bot by difficulty:', error);
      res.status(500).json({
        success: false,
        message: 'Bot bulunamadı',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Challenge a bot
  async challengeBot(req, res) {
    try {
      const userId = req.user.userId;
      const { testId, difficulty = 1 } = req.body;

      if (!testId) {
        return res.status(400).json({
          success: false,
          message: 'Test ID is required',
        });
      }

      const botDuel = await botService.createBotDuelLegacy(
        userId,
        testId,
        difficulty,
      );

      res.status(201).json({
        success: true,
        duel: botDuel,
        message: 'Bot challenge created successfully',
      });
    } catch (error) {
      console.error('Bot challenge error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create bot challenge',
      });
    }
  },

  // NEW: Course-based bot challenge endpoint
  async challengeBotWithCourse(req, res) {
    try {
      const userId = req.user.userId;
      const { courseId, difficulty = 1 } = req.body;

      if (!courseId) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required',
        });
      }

      console.log(
        `Creating course-based bot challenge: courseId=${courseId}, difficulty=${difficulty}, userId=${userId}`,
      );

      const botDuel = await botService.createBotDuelWithCourse(
        userId,
        courseId,
        difficulty,
      );

      res.status(201).json({
        success: true,
        duel: botDuel,
        message: 'Course-based bot challenge created successfully',
      });
    } catch (error) {
      console.error('Course-based bot challenge error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create course-based bot challenge',
      });
    }
  },

  // Generic bot challenge endpoint that handles both
  async challengeBotGeneric(req, res) {
    try {
      const userId = req.user.userId;
      const { testId, courseId, difficulty = 1 } = req.body;

      if (!testId && !courseId) {
        return res.status(400).json({
          success: false,
          message: 'Either testId or courseId is required',
        });
      }

      if (testId && courseId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot provide both testId and courseId',
        });
      }

      let botDuel;

      if (courseId) {
        console.log(
          `Creating course-based bot challenge: courseId=${courseId}, difficulty=${difficulty}`,
        );
        botDuel = await botService.createBotDuelWithCourse(
          userId,
          courseId,
          difficulty,
        );
      } else {
        console.log(
          `Creating test-based bot challenge: testId=${testId}, difficulty=${difficulty}`,
        );
        botDuel = await botService.createBotDuelLegacy(
          userId,
          testId,
          difficulty,
        );
      }

      res.status(201).json({
        success: true,
        duel: botDuel,
        message: 'Bot challenge created successfully',
      });
    } catch (error) {
      console.error('Generic bot challenge error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create bot challenge',
      });
    }
  },

  // Check if user is a bot
  async checkIsBot(req, res) {
    try {
      const { userId } = req.params;
      const userIdInt = parseInt(userId);

      if (!userIdInt || userIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz kullanıcı ID',
        });
      }

      const isBot = await botService.isBot(userIdInt);

      res.status(200).json({
        success: true,
        isBot: isBot,
      });
    } catch (error) {
      console.error('Error checking if user is bot:', error);
      res.status(500).json({
        success: false,
        message: 'Bot kontrolü yapılamadı',
        isBot: false,
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Get bot info by user ID
  async getBotInfo(req, res) {
    try {
      const { userId } = req.params;
      const userIdInt = parseInt(userId);

      if (!userIdInt || userIdInt <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz kullanıcı ID',
        });
      }

      const botInfo = await botService.getBotInfo(userIdInt);

      if (!botInfo) {
        return res.status(404).json({
          success: false,
          message: 'Bot bilgisi bulunamadı',
        });
      }

      res.status(200).json({
        success: true,
        data: botInfo,
      });
    } catch (error) {
      console.error('Error getting bot info:', error);
      res.status(500).json({
        success: false,
        message: 'Bot bilgisi alınamadı',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Get bot leaderboard
  async getBotLeaderboard(req, res) {
    try {
      const { limit = 10, sortBy = 'difficulty' } = req.query;

      const bots = await botService.getAvailableBots();

      // Sort bots based on criteria
      let sortedBots = [...bots];
      switch (sortBy) {
        case 'accuracy':
          sortedBots.sort((a, b) => b.accuracyRate - a.accuracyRate);
          break;
        case 'speed':
          sortedBots.sort((a, b) => a.avgResponseTime - b.avgResponseTime);
          break;
        case 'difficulty':
        default:
          sortedBots.sort((a, b) => {
            if (a.difficultyLevel === b.difficultyLevel) {
              return b.accuracyRate - a.accuracyRate;
            }
            return a.difficultyLevel - b.difficultyLevel;
          });
          break;
      }

      // Apply limit
      if (limit && limit > 0) {
        sortedBots = sortedBots.slice(0, parseInt(limit));
      }

      res.status(200).json({
        success: true,
        data: sortedBots,
        count: sortedBots.length,
        sortBy: sortBy,
      });
    } catch (error) {
      console.error('Error getting bot leaderboard:', error);
      res.status(500).json({
        success: false,
        message: 'Bot liderlik tablosu yüklenemedi',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Get recommended bot for user
  async getRecommendedBot(req, res) {
    try {
      const userId = req.user.user_id || req.user.id;

      // For now, recommend the easiest bot
      // You could implement more sophisticated logic here based on user performance
      const recommendedBot = await botService.getBotByDifficulty(1);

      if (!recommendedBot) {
        return res.status(404).json({
          success: false,
          message: 'Önerilen bot bulunamadı',
        });
      }

      res.status(200).json({
        success: true,
        data: recommendedBot,
        reason: 'Başlangıç seviyesi için önerilen',
      });
    } catch (error) {
      console.error('Error getting recommended bot:', error);
      res.status(500).json({
        success: false,
        message: 'Önerilen bot bulunamadı',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
};

module.exports = botController;
