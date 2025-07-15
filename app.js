const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// CREATE: HTTP server (required for Socket.IO)
const server = http.createServer(app);

// SOCKET.IO SETUP: Production-ready configuration
const io = socketIo(server, {
  cors: {
    origin: [
      'com.dusapptr.dusapp',
      'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_EAS_BUILD || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_DEFAULT || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_EXPO_GO ||
        'https://auth.expo.io/@dusapptr/dus-app',
      'exp://localhost:8081',
      'exp://192.168.1.100:8081',
      'http://localhost:3000',
      'http://localhost:8081',
      'https://localhost:3000',
      ...(process.env.SOCKET_CORS_ORIGINS
        ? process.env.SOCKET_CORS_ORIGINS.split(',')
        : []),
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowEIO3: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowRequest: (req, callback) => {
    callback(null, true);
  },
});

// IMPORT: Socket handlers for real-time duels
// let setupDuelSockets;
// try {
//   setupDuelSockets = require('./sockets/duelSocketHandler');
//   setupDuelSockets(io);
//   console.log('✅ Real-time duel handlers initialized');
// } catch (error) {
//   console.warn(
//     '⚠️  Duel socket handlers not found - will create files if needed',
//   );
// }

// MIDDLEWARE (keeping your working configuration)
app.use(
  cors({
    origin: [
      'com.dusapptr.dusapp',
      'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_EAS_BUILD || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_EXPO_GO ||
        'https://auth.expo.io/@dusapptr/dus-app',
      'http://localhost:3000',
      'http://localhost:8081',
      'exp://localhost:8081',
      'exp://192.168.1.100:8081',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  }),
);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    socketConnections: io.engine.clientsCount || 0,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Swagger security components (from your old working config)
const swaggerSecurity = {
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

// Swagger options (corrected)
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'DUS Application API',
      version: '1.0.0',
      description: 'API documentation for the DUS medical education platform',
    },
    servers: [
      {
        // FIX: Use API_URL correctly (only for Swagger, not routing)
        url:
          process.env.NODE_ENV === 'production'
            ? process.env.API_URL || 'https://dus-backend.railway.app'
            : `http://localhost:${PORT}`,
        description: 'API Server',
      },
    ],
    ...swaggerSecurity,
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ROOT ROUTE (enhanced version)
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the DUS Application API',
    version: '1.0.0',
    features: ['REST API', 'Real-time Duels', 'Socket.IO'],
    status: 'operational',
    socketConnections: io.engine.clientsCount || 0,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ROUTES - BACK TO SIMPLE WORKING APPROACH FROM YOUR OLD APP.JS
console.log('🚀 Loading routes using simple approach...');

// Import all routes (like in your old app.js)
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const testRoutes = require('./routes/testRoutes');
const questionRoutes = require('./routes/questionRoutes');
const resultRoutes = require('./routes/resultRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const courseRoutes = require('./routes/courseRoutes');
const topicRoutes = require('./routes/topicRoutes');
const subtopicRoutes = require('./routes/subtopicRoutes');
const studyRoutes = require('./routes/studyRoutes');
const coachingRoutes = require('./routes/coachingRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const friendRoutes = require('./routes/friendRoutes');
const answerRoutes = require('./routes/answerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const duelRoutes = require('./routes/duelRoutes');
const duelResultRoutes = require('./routes/duelResultRoutes');

// Mount routes (like in your old app.js)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/subtopics', subtopicRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/coaching', coachingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/studyPlans', studyPlanRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/duels', duelRoutes);
app.use('/api/duel-results', duelResultRoutes);

console.log('✅ All routes loaded successfully using simple approach');

// CRON JOBS (keep as is)
try {
  const notificationCronJobs = require('./services/notificationCronJobs');
  if (process.env.ENABLE_CRON_JOBS === 'true') {
    notificationCronJobs.init();
    notificationCronJobs.startAll();
    console.log('✅ Notification cron jobs started');
  }
} catch (error) {
  console.warn('⚠️  Failed to start cron jobs:', error.message);
}

// SOCKET.IO CONNECTION HANDLING (keep as is)
io.on('connection', (socket) => {
  console.log(
    `🔗 Socket connected: ${socket.id} (Total: ${io.engine.clientsCount})`,
  );

  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    serverVersion: '1.0.0',
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Socket disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });

  socket.on('heartbeat', () => {
    socket.emit('heartbeat', { timestamp: new Date().toISOString() });
  });
});

// ERROR HANDLING (keep as is)
app.use((err, req, res, next) => {
  console.error('💥 Application Error:', err.stack);

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    message: isDevelopment ? err.message : 'Something went wrong!',
    error: isDevelopment ? err.stack : {},
    timestamp: new Date().toISOString(),
  });
});

// 404 HANDLER (simplified)
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// GRACEFUL SHUTDOWN (keep as is)
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    io.close(() => {
      console.log('✅ Socket.IO server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    io.close(() => {
      console.log('✅ Socket.IO server closed');
      process.exit(0);
    });
  });
});

// UNCAUGHT EXCEPTION HANDLER (enhanced for path-to-regexp debugging)
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('💥 Stack:', error.stack);

  // Special handling for path-to-regexp errors
  if (error.message.includes('Missing parameter name')) {
    console.error('\n🚨 PATH-TO-REGEXP ERROR DETECTED:');
    console.error('This error occurs when a route has a malformed parameter.');
    console.error('Check your route files for patterns like:');
    console.error("- router.get('/:')");
    console.error("- router.post('/:id/')");
    console.error("- router.put('/users/:')");
    console.error("- router.delete('/:id/:')");
  }

  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// START SERVER (keep as is)
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ================================');
  console.log(`🚀 DUS API Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Socket.IO server ready for real-time duels`);
  console.log(
    `📚 API Documentation: ${
      process.env.API_URL || `http://localhost:${PORT}`
    }/api-docs`,
  );
  console.log(
    `💊 Health Check: ${
      process.env.API_URL || `http://localhost:${PORT}`
    }/health`,
  );
  console.log('🚀 ================================\n');
});

module.exports = { app, server, io };
