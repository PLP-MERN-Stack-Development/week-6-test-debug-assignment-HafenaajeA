// Logger configuration using Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bug-tracker-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Custom logging methods for different debugging scenarios
logger.debugAPI = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  next();
};

logger.debugDatabase = (operation, model, data) => {
  logger.debug(`DB Operation: ${operation} on ${model}`, {
    data,
    timestamp: new Date().toISOString()
  });
};

logger.debugAuth = (action, userId, details) => {
  logger.info(`Auth Action: ${action}`, {
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
