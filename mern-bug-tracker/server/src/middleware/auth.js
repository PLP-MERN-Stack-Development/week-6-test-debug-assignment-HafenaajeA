// Authentication middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const logger = require('../config/logger');
const { extractTokenFromHeader, verifyToken } = require('../utils/auth');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from token
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Token is invalid or user is inactive.',
      });
    }

    // Add user to request object
    req.user = user;
    
    // Log authentication for debugging
    logger.debugAuth('User authenticated', user._id, {
      username: user.username,
      role: user.role,
      endpoint: req.originalUrl,
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token is invalid.',
    });
  }
};

// Optional authentication - doesn't require token but adds user if present
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Don't block request for optional auth
    next();
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.username} with role ${req.user.role}. Required roles: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

// Check if user can modify resource
const canModifyResource = (resourceField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
        });
      }

      // Admin can modify anything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[resourceField];
      
      // For bugs, check if user is reporter or assignee
      if (req.route.path.includes('/bugs')) {
        const Bug = require('../models/Bug');
        const bug = await Bug.findById(resourceId);
        
        if (!bug) {
          return res.status(404).json({
            success: false,
            error: 'Bug not found.',
          });
        }

        const canModify = bug.reporter.equals(req.user._id) || 
                         (bug.assignee && bug.assignee.equals(req.user._id));

        if (!canModify) {
          return res.status(403).json({
            success: false,
            error: 'You can only modify bugs you reported or are assigned to.',
          });
        }

        req.bug = bug; // Add bug to request for use in controller
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error during authorization.',
      });
    }
  };
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId);
      const validRequests = requests.filter(time => time > windowStart);
      userRequests.set(userId, validRequests);
    }

    // Check current requests
    const currentRequests = userRequests.get(userId) || [];
    
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Add current request
    currentRequests.push(now);
    userRequests.set(userId, currentRequests);

    next();
  };
};

// Check API key (for future enhancement)
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required.',
    });
  }

  // Validate API key (this would typically check against a database)
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key.',
    });
  }

  next();
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  canModifyResource,
  userRateLimit,
  checkApiKey,
};
