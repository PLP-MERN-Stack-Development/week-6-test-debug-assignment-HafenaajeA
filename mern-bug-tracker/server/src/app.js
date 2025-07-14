// Main application file
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import configuration and utilities
const config = require('./config');
const logger = require('./config/logger');
const { connectDB } = require('./config/database');

// Import middleware
const { globalErrorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeInput, addRateLimitHeaders } = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/authRoutes');
const bugRoutes = require('./routes/bugRoutes');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Custom middleware
app.use(sanitizeInput);
app.use(addRateLimitHeaders);

// Debug middleware for development
if (config.NODE_ENV === 'development') {
  app.use(logger.debugAPI);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Bug Tracker API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password',
        logout: 'POST /api/auth/logout',
        users: 'GET /api/auth/users (admin)',
        updateUserRole: 'PUT /api/auth/users/:id/role (admin)',
        deactivateUser: 'PUT /api/auth/users/:id/deactivate (admin)',
      },
      bugs: {
        list: 'GET /api/bugs',
        create: 'POST /api/bugs',
        get: 'GET /api/bugs/:id',
        update: 'PUT /api/bugs/:id',
        delete: 'DELETE /api/bugs/:id',
        assign: 'PUT /api/bugs/:id/assign',
        comment: 'POST /api/bugs/:id/comments',
        watch: 'PUT /api/bugs/:id/watch',
        statistics: 'GET /api/bugs/statistics',
        myAssigned: 'GET /api/bugs/my-assigned',
        myReported: 'GET /api/bugs/my-reported',
      },
    },
  });
});

// Catch-all for undefined routes
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
