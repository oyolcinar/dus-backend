const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Then add it to your swaggerDefinition
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'DUS Application API',
      version: '1.0.0',
      description: 'API documentation for the test application',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    ...swaggerSecurity, // Add this line
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Test Application API' });
});

// Routes
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {},
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
