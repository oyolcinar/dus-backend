const express = require('express');
const http = require('http'); // ADD: HTTP server for Socket.IO
const socketIo = require('socket.io'); // ADD: Socket.IO
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
      // Production mobile app schemes
      'com.dusapptr.dusapp',
      'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_EAS_BUILD || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_DEFAULT || 'com.dusapptr.dusapp://',

      // Expo development URLs
      process.env.FRONTEND_URL_EXPO_GO ||
        'https://auth.expo.io/@dusapptr/dus-app',
      'exp://localhost:8081',
      'exp://192.168.1.100:8081', // Update with your IP if needed

      // Development URLs
      'http://localhost:3000',
      'http://localhost:8081',
      'https://localhost:3000',

      // Railway domain (will be set via environment variable)
      ...(process.env.SOCKET_CORS_ORIGINS
        ? process.env.SOCKET_CORS_ORIGINS.split(',')
        : []),
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowEIO3: true, // Support older clients
  },
  transports: ['websocket', 'polling'], // Support both transport types
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 30000, // 30 seconds
  allowRequest: (req, callback) => {
    // Allow all requests in production for now - can add validation later
    callback(null, true);
  },
});

// IMPORT: Socket handlers for real-time duels
let setupDuelSockets;
try {
  setupDuelSockets = require('./sockets/duelSocketHandler');
  setupDuelSockets(io);
  console.log('✅ Real-time duel handlers initialized');
} catch (error) {
  console.warn('⚠️  Duel socket handlers not found - real-time duels disabled');
  console.warn(
    'Create ./sockets/duelSocketHandler.js to enable real-time duels',
  );
}

// MIDDLEWARE: CORS configuration for production
app.use(
  cors({
    origin: [
      // Production URLs
      'com.dusapptr.dusapp',
      'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_EAS_BUILD || 'com.dusapptr.dusapp://',
      process.env.FRONTEND_URL_EXPO_GO ||
        'https://auth.expo.io/@dusapptr/dus-app',

      // Development URLs
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
    crossOriginEmbedderPolicy: false, // Allow Socket.IO embedding
    contentSecurityPolicy: false, // Disable for development, configure for production
  }),
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' })); // Increase limit for mobile uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HEALTH CHECK: For Railway and monitoring
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

// Swagger security components
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

// Swagger configuration with production URL
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'DUS Application API',
      version: '1.0.0',
      description:
        'API documentation for the DUS medical education platform with real-time duels',
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${PORT}`,
        description: 'API Server',
      },
      ...(process.env.NODE_ENV === 'production'
        ? []
        : [
            {
              url: `http://localhost:${PORT}`,
              description: 'Local Development Server',
            },
          ]),
    ],
    ...swaggerSecurity,
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    explorer: true,
    customSiteTitle: 'DUS API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);

// ROOT ROUTE: Enhanced with real-time status
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the DUS Application API',
    version: '1.0.0',
    features: [
      'REST API',
      'Real-time Duels',
      'Socket.IO',
      'Medical Education Platform',
      'Mobile App Support',
    ],
    status: 'operational',
    socketConnections: io.engine.clientsCount || 0,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    documentation: '/api-docs',
    health: '/health',
  });
});

// API ROUTES: All existing routes maintained
const userRoutes = require('./routes/userRoutes');
const testRoutes = require('./routes/testRoutes');
const questionRoutes = require('./routes/questionRoutes');
const resultRoutes = require('./routes/resultRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const duelRoutes = require('./routes/duelRoutes');
const courseRoutes = require('./routes/courseRoutes');
const topicRoutes = require('./routes/topicRoutes');
const subtopicRoutes = require('./routes/subtopicRoutes');
const studyRoutes = require('./routes/studyRoutes');
const coachingRoutes = require('./routes/coachingRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const friendRoutes = require('./routes/friendRoutes');
const answerRoutes = require('./routes/answerRoutes');
const duelResultRoutes = require('./routes/duelResultRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/duels', duelRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/subtopics', subtopicRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/coaching', coachingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/studyPlans', studyPlanRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/duel-results', duelResultRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// CRON JOBS: Notification system
const notificationCronJobs = require('./services/notificationCronJobs');

// Initialize cron jobs if enabled
if (process.env.ENABLE_CRON_JOBS === 'true') {
  try {
    notificationCronJobs.init();
    notificationCronJobs.startAll();
    console.log('✅ Notification cron jobs started');
  } catch (error) {
    console.warn('⚠️  Failed to start cron jobs:', error.message);
  }
}

// SOCKET.IO: Connection handling and monitoring
io.on('connection', (socket) => {
  console.log(
    `🔗 Socket connected: ${socket.id} (Total: ${io.engine.clientsCount})`,
  );

  // Basic connection info
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    serverVersion: '1.0.0',
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(
      `🔌 Socket disconnected: ${socket.id}, reason: ${reason} (Total: ${io.engine.clientsCount})`,
    );
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });

  // Heartbeat for connection monitoring
  socket.on('heartbeat', () => {
    socket.emit('heartbeat', { timestamp: new Date().toISOString() });
  });
});

// PRODUCTION MONITORING: Log Socket.IO metrics
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const connections = io.engine.clientsCount;
    if (connections > 0) {
      console.log(`📊 Active Socket.IO connections: ${connections}`);
    }
  }, 300000); // Log every 5 minutes if there are connections
}

// ERROR HANDLING: Enhanced for production
app.use((err, req, res, next) => {
  console.error('💥 Application Error:', err.stack);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    message: isDevelopment ? err.message : 'Something went wrong!',
    error: isDevelopment ? err.stack : {},
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  });
});

// 404 HANDLER: For unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/api-docs - API Documentation',
      '/health - Health Check',
      '/api/auth - Authentication',
      '/api/duels - Real-time Duels',
      '/api/tests - Tests and Questions',
    ],
  });
});

// GRACEFUL SHUTDOWN: Handle process termination
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

// UNCAUGHT EXCEPTIONS: Log and exit gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// START SERVER: Use server.listen instead of app.listen for Socket.IO
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ================================');
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
  console.log('🚀 ================================');
});

// EXPORT: For testing and module usage
module.exports = { app, server, io };
