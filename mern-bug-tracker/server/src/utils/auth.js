// Authentication utilities
const jwt = require('jsonwebtoken');
const config = require('../config');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Extract token from request header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// Generate password reset token
const generatePasswordResetToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

// Hash password reset token
const hashPasswordResetToken = (token) => {
  return require('crypto').createHash('sha256').update(token).digest('hex');
};

// Check if user has required role
const hasRole = (userRole, requiredRoles) => {
  if (typeof requiredRoles === 'string') {
    return userRole === requiredRoles;
  }
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole);
  }
  
  return false;
};

// Check if user can access resource
const canAccessResource = (user, resource, action = 'read') => {
  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }

  // For bugs
  if (resource.constructor.modelName === 'Bug') {
    switch (action) {
      case 'read':
        return true; // Everyone can read bugs
      case 'create':
        return ['reporter', 'developer', 'admin'].includes(user.role);
      case 'update':
        return user.role === 'admin' || 
               resource.reporter.equals(user.id) || 
               resource.assignee?.equals(user.id);
      case 'delete':
        return user.role === 'admin' || resource.reporter.equals(user.id);
      default:
        return false;
    }
  }

  // For users
  if (resource.constructor.modelName === 'User') {
    switch (action) {
      case 'read':
        return true; // Everyone can read basic user info
      case 'update':
        return user.role === 'admin' || resource._id.equals(user.id);
      case 'delete':
        return user.role === 'admin';
      default:
        return false;
    }
  }

  return false;
};

// Rate limiting helpers
const createRateLimitKey = (identifier, endpoint) => {
  return `rate_limit:${endpoint}:${identifier}`;
};

// API key validation (for future enhancement)
const validateApiKey = (apiKey) => {
  // This would typically check against a database
  // For now, just basic validation
  return apiKey && apiKey.length === 32;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  generatePasswordResetToken,
  hashPasswordResetToken,
  hasRole,
  canAccessResource,
  createRateLimitKey,
  validateApiKey,
};
