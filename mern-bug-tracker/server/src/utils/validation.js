// Validation utilities
const Joi = require('joi');

// Email validation utility
const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Password strength validation
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength score
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character types
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;
  
  // Bonus for variety
  if (password.length >= 16) score += 1;
  
  return Math.min(score, 5); // Max score of 5
};

// Username validation
const validateUsername = (username) => {
  const errors = [];
  
  if (!username || username.trim().length === 0) {
    errors.push('Username is required');
  }
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (username.length > 30) {
    errors.push('Username cannot exceed 30 characters');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Bug title validation
const validateBugTitle = (title) => {
  const errors = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Bug title is required');
  }
  
  if (title.length > 200) {
    errors.push('Bug title cannot exceed 200 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Priority validation
const validatePriority = (priority) => {
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  return validPriorities.includes(priority);
};

// Status validation
const validateStatus = (status) => {
  const validStatuses = ['open', 'in-progress', 'testing', 'resolved', 'closed'];
  return validStatuses.includes(status);
};

// Status transition validation
const validateStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = {
    'open': ['in-progress', 'closed'],
    'in-progress': ['testing', 'open', 'closed'],
    'testing': ['resolved', 'in-progress', 'open'],
    'resolved': ['closed', 'open'],
    'closed': ['open']
  };
  
  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};

// Sanitize HTML input
const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate object ID
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Generate slug from text
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
};

// Date formatting utilities
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    default:
      return d.toISOString();
  }
};

// Time ago utility
const timeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
};

// Joi schemas for validation
const userRegistrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().max(50).required(),
  lastName: Joi.string().max(50).required(),
});

const bugCreateSchema = Joi.object({
  title: Joi.string().max(200).required(),
  description: Joi.string().max(2000).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  severity: Joi.string().valid('minor', 'major', 'critical', 'blocker').default('major'),
  category: Joi.string().valid('bug', 'feature', 'enhancement', 'task').default('bug'),
  environment: Joi.string().valid('development', 'staging', 'production').default('development'),
  stepsToReproduce: Joi.array().items(
    Joi.object({
      step: Joi.string().required(),
      order: Joi.number().required(),
    })
  ),
  expectedResult: Joi.string().max(1000),
  actualResult: Joi.string().max(1000),
  tags: Joi.array().items(Joi.string()),
  dueDate: Joi.date(),
});

module.exports = {
  isValidEmail,
  validatePasswordStrength,
  calculatePasswordStrength,
  validateUsername,
  validateBugTitle,
  validatePriority,
  validateStatus,
  validateStatusTransition,
  sanitizeHtml,
  isValidObjectId,
  generateSlug,
  formatDate,
  timeAgo,
  userRegistrationSchema,
  bugCreateSchema,
};
