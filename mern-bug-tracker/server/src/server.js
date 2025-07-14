// Server entry point
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { connectDB } = require('./config/database');

// Connect to database
connectDB();

// Start server
const server = app.listen(config.PORT, () => {
  logger.info(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;
