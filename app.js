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
let setupDuelSockets;
try {
  setupDuelSockets = require('./sockets/duelSocketHandler');
  setupDuelSockets(io);
  console.log('✅ Real-time duel handlers initialized');
} catch (error) {
  console.warn(
    '⚠️  Duel socket handlers not found - will create files if needed',
  );
}

// MIDDLEWARE
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

// Swagger configuration
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
        url: process.env.API_URL || `http://localhost:${PORT}`,
        description: 'API Server',
      },
    ],
    ...swaggerSecurity,
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ROOT ROUTE
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

// FUNCTION TO SAFELY LOAD ROUTES WITH DETAILED ERROR REPORTING
function safeLoadRoute(routePath, mountPath) {
  try {
    console.log(`🔍 Loading route: ${routePath} -> ${mountPath}`);
    const route = require(routePath);

    // Check if route is a valid Express router
    if (typeof route !== 'function') {
      throw new Error(
        `Route ${routePath} does not export a valid Express router`,
      );
    }

    app.use(mountPath, route);
    console.log(`✅ Route loaded successfully: ${mountPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to load route ${routePath}:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);

    // Create a fallback route that returns an error message
    app.use(mountPath, (req, res) => {
      res.status(503).json({
        error: `Route ${mountPath} is temporarily unavailable`,
        message: 'This route has a configuration issue and is being fixed',
        routePath: routePath,
        timestamp: new Date().toISOString(),
      });
    });
    return false;
  }
}

// LOAD ROUTES SAFELY - This will help identify which route is causing the issue
console.log('🚀 Starting route loading process...');

// Track which routes load successfully
const routeLoadResults = [];

// Load each route and track results
const routes = [
  { path: './routes/authRoutes', mount: '/api/auth' },
  { path: './routes/adminRoutes', mount: '/api/admin' },
  { path: './routes/userRoutes', mount: '/api/users' },
  { path: './routes/testRoutes', mount: '/api/tests' },
  { path: './routes/questionRoutes', mount: '/api/questions' },
  { path: './routes/resultRoutes', mount: '/api/results' },
  { path: './routes/achievementRoutes', mount: '/api/achievements' },
  { path: './routes/courseRoutes', mount: '/api/courses' },
  { path: './routes/topicRoutes', mount: '/api/topics' },
  { path: './routes/subtopicRoutes', mount: '/api/subtopics' },
  { path: './routes/studyRoutes', mount: '/api/study' },
  { path: './routes/coachingRoutes', mount: '/api/coaching' },
  { path: './routes/subscriptionRoutes', mount: '/api/subscriptions' },
  { path: './routes/studyPlanRoutes', mount: '/api/studyPlans' },
  { path: './routes/friendRoutes', mount: '/api/friends' },
  { path: './routes/answerRoutes', mount: '/api/answers' },
  { path: './routes/analyticsRoutes', mount: '/api/analytics' },
  { path: './routes/notificationRoutes', mount: '/api/notifications' },
  { path: './routes/duelRoutes', mount: '/api/duels' },
  { path: './routes/duelResultRoutes', mount: '/api/duel-results' },
];

// Load each route with detailed error reporting
for (const route of routes) {
  const success = safeLoadRoute(route.path, route.mount);
  routeLoadResults.push({ ...route, success });
}

// Report results
console.log('\n📊 Route Loading Summary:');
console.log('='.repeat(50));
const successCount = routeLoadResults.filter((r) => r.success).length;
const failCount = routeLoadResults.filter((r) => r.success === false).length;

console.log(`✅ Successfully loaded: ${successCount} routes`);
console.log(`❌ Failed to load: ${failCount} routes`);

if (failCount > 0) {
  console.log('\n❌ Failed routes:');
  routeLoadResults
    .filter((r) => r.success === false)
    .forEach((r) => console.log(`   - ${r.mount} (${r.path})`));
}

console.log('='.repeat(50));

// CRON JOBS
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

// SOCKET.IO CONNECTION HANDLING
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

// ERROR HANDLING
app.use((err, req, res, next) => {
  console.error('💥 Application Error:', err.stack);

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    message: isDevelopment ? err.message : 'Something went wrong!',
    error: isDevelopment ? err.stack : {},
    timestamp: new Date().toISOString(),
  });
});

// 404 HANDLER
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: routeLoadResults
      .filter((r) => r.success)
      .map((r) => r.mount),
  });
});

// GRACEFUL SHUTDOWN
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

// UNCAUGHT EXCEPTION HANDLER
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('💥 Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// START SERVER
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
