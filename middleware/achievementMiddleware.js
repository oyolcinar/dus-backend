const achievementService = require('../services/achievementService');
const NotificationHelpers = require('../services/notificationHelpers');

/**
 * Middleware for automatically triggering achievement checks after user actions
 */

class AchievementMiddleware {
  // Middleware to check achievements after study session completion
  static checkAchievementsAfterStudySession() {
    return async (req, res, next) => {
      try {
        // Store the original res.json function
        const originalJson = res.json;

        // Override res.json to trigger achievement check after successful response
        res.json = function (data) {
          // Call the original res.json first
          const result = originalJson.call(this, data);

          // Only trigger achievement check if the response was successful
          if (
            res.statusCode >= 200 &&
            res.statusCode < 300 &&
            req.user?.userId
          ) {
            // Trigger achievement check asynchronously (don't wait for it)
            setImmediate(async () => {
              try {
                console.log(
                  `Triggering achievement check after study session for user ${req.user.userId}`,
                );
                await NotificationHelpers.handleStudySessionCompleted(
                  req.user.userId,
                  req.body,
                );
              } catch (error) {
                console.error(
                  'Error in study session achievement check:',
                  error,
                );
                // Don't throw - this shouldn't break the main flow
              }
            });
          }

          return result;
        };

        next();
      } catch (error) {
        console.error('Error in study session achievement middleware:', error);
        next(); // Continue with the request even if middleware fails
      }
    };
  }

  // Middleware to check achievements after duel completion
  static checkAchievementsAfterDuel() {
    return async (req, res, next) => {
      try {
        const originalJson = res.json;

        res.json = function (data) {
          const result = originalJson.call(this, data);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            setImmediate(async () => {
              try {
                // Check achievements for both participants if duel data is available
                const duelData = req.body;

                if (duelData.winnerId) {
                  console.log(
                    `Triggering achievement check after duel for winner ${duelData.winnerId}`,
                  );
                  await achievementService.triggerAchievementCheck(
                    duelData.winnerId,
                    'duel_completed',
                  );
                }

                if (duelData.loserId) {
                  console.log(
                    `Triggering achievement check after duel for loser ${duelData.loserId}`,
                  );
                  await achievementService.triggerAchievementCheck(
                    duelData.loserId,
                    'duel_completed',
                  );
                }

                // Also check for the current user if they're involved
                if (
                  req.user?.userId &&
                  !duelData.winnerId &&
                  !duelData.loserId
                ) {
                  await achievementService.triggerAchievementCheck(
                    req.user.userId,
                    'duel_completed',
                  );
                }
              } catch (error) {
                console.error('Error in duel achievement check:', error);
              }
            });
          }

          return result;
        };

        next();
      } catch (error) {
        console.error('Error in duel achievement middleware:', error);
        next();
      }
    };
  }

  // Middleware to check achievements after user registration
  static checkAchievementsAfterRegistration() {
    return async (req, res, next) => {
      try {
        const originalJson = res.json;

        res.json = function (data) {
          const result = originalJson.call(this, data);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            setImmediate(async () => {
              try {
                // Get user ID from response data or request
                const userId =
                  data?.user?.user_id || data?.userId || req.user?.userId;

                if (userId) {
                  console.log(
                    `Triggering achievement check after registration for user ${userId}`,
                  );
                  await NotificationHelpers.handleUserRegistration(userId);
                }
              } catch (error) {
                console.error(
                  'Error in registration achievement check:',
                  error,
                );
              }
            });
          }

          return result;
        };

        next();
      } catch (error) {
        console.error('Error in registration achievement middleware:', error);
        next();
      }
    };
  }

  // Generic middleware for any action type
  static checkAchievementsAfterAction(actionType) {
    return async (req, res, next) => {
      try {
        const originalJson = res.json;

        res.json = function (data) {
          const result = originalJson.call(this, data);

          if (
            res.statusCode >= 200 &&
            res.statusCode < 300 &&
            req.user?.userId
          ) {
            setImmediate(async () => {
              try {
                console.log(
                  `Triggering achievement check after ${actionType} for user ${req.user.userId}`,
                );
                await achievementService.triggerAchievementCheck(
                  req.user.userId,
                  actionType,
                );
              } catch (error) {
                console.error(
                  `Error in ${actionType} achievement check:`,
                  error,
                );
              }
            });
          }

          return result;
        };

        next();
      } catch (error) {
        console.error(`Error in ${actionType} achievement middleware:`, error);
        next();
      }
    };
  }

  // Middleware to check achievements for multiple users (for bulk operations)
  static checkAchievementsForMultipleUsers(getUserIdsFromRequest) {
    return async (req, res, next) => {
      try {
        const originalJson = res.json;

        res.json = function (data) {
          const result = originalJson.call(this, data);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            setImmediate(async () => {
              try {
                const userIds = getUserIdsFromRequest(req, data);

                if (userIds && Array.isArray(userIds) && userIds.length > 0) {
                  console.log(
                    `Triggering achievement check for ${userIds.length} users`,
                  );
                  await achievementService.checkMultipleUsersAchievements(
                    userIds,
                  );
                }
              } catch (error) {
                console.error('Error in bulk achievement check:', error);
              }
            });
          }

          return result;
        };

        next();
      } catch (error) {
        console.error('Error in bulk achievement middleware:', error);
        next();
      }
    };
  }

  // Conditional middleware - only trigger if certain conditions are met
  static checkAchievementsIf(condition, actionType) {
    return async (req, res, next) => {
      try {
        const originalJson = res.json;

        res.json = function (data) {
          const result = originalJson.call(this, data);

          if (
            res.statusCode >= 200 &&
            res.statusCode < 300 &&
            req.user?.userId
          ) {
            setImmediate(async () => {
              try {
                // Check if condition is met
                const shouldCheck = await condition(req, res, data);

                if (shouldCheck) {
                  console.log(
                    `Conditional achievement check triggered for ${actionType}`,
                  );
                  await achievementService.triggerAchievementCheck(
                    req.user.userId,
                    actionType,
                  );
                }
              } catch (error) {
                console.error(
                  `Error in conditional ${actionType} achievement check:`,
                  error,
                );
              }
            });
          }

          return result;
        };

        next();
      } catch (error) {
        console.error(
          `Error in conditional ${actionType} achievement middleware:`,
          error,
        );
        next();
      }
    };
  }

  // Middleware to add achievement progress to response
  static addAchievementProgress() {
    return async (req, res, next) => {
      try {
        const originalJson = res.json;

        res.json = function (data) {
          // If user is authenticated, add achievement progress
          if (req.user?.userId && data && typeof data === 'object') {
            setImmediate(async () => {
              try {
                const progress =
                  await achievementService.getUserAchievementProgress(
                    req.user.userId,
                  );

                // You could store this in a cache or send it via websocket
                // For now, we'll just log it
                console.log(`User ${req.user.userId} achievement progress:`, {
                  totalAchievements: progress.length,
                  completedProgress: progress.filter(
                    (p) => p.overall_progress === 100,
                  ).length,
                });
              } catch (error) {
                console.error('Error getting achievement progress:', error);
              }
            });
          }

          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Error in achievement progress middleware:', error);
        next();
      }
    };
  }

  // Rate limiting middleware for achievement checks (prevent spam)
  static rateLimitAchievementChecks(windowMs = 60000, maxChecks = 5) {
    const userCheckCounts = new Map();

    return async (req, res, next) => {
      try {
        if (!req.user?.userId) {
          return next();
        }

        const userId = req.user.userId;
        const now = Date.now();
        const userKey = `achievement_check_${userId}`;

        // Get user's check history
        let userChecks = userCheckCounts.get(userKey) || [];

        // Remove old checks outside the window
        userChecks = userChecks.filter(
          (checkTime) => now - checkTime < windowMs,
        );

        // Check if user has exceeded rate limit
        if (userChecks.length >= maxChecks) {
          console.warn(
            `Achievement check rate limit exceeded for user ${userId}`,
          );
          return next(); // Continue without triggering achievement check
        }

        // Add current check to history
        userChecks.push(now);
        userCheckCounts.set(userKey, userChecks);

        next();
      } catch (error) {
        console.error('Error in achievement rate limiting middleware:', error);
        next();
      }
    };
  }

  // Cleanup middleware data periodically
  static startCleanupTask() {
    // Clean up rate limiting data every hour
    setInterval(() => {
      try {
        console.log('Cleaning up achievement middleware data...');
        // This would clean up the userCheckCounts Map if it gets too large
        // Implementation depends on your specific needs
      } catch (error) {
        console.error('Error in achievement middleware cleanup:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}

module.exports = AchievementMiddleware;
