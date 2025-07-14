// Validation middleware
const { validationResult } = require('express-validator');
const { validationError } = require('./errorHandler');

// Check validation results
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json(validationError(errors.array()));
  }
  
  next();
};

// Sanitize user input
const sanitizeInput = (req, res, next) => {
  // Basic XSS protection
  const sanitize = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Pagination validation
const validatePagination = (req, res, next) => {
  let { page = 1, limit = 10 } = req.query;
  
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  
  // Validate page
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  
  // Validate limit
  if (isNaN(limit) || limit < 1) {
    limit = 10;
  }
  
  // Max limit to prevent abuse
  if (limit > 100) {
    limit = 100;
  }
  
  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit,
  };
  
  next();
};

// Sort validation
const validateSort = (req, res, next) => {
  const { sort } = req.query;
  const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'priority', 'status'];
  const sortObj = {};
  
  if (sort) {
    const sortFields = sort.split(',');
    
    sortFields.forEach(field => {
      let sortField = field;
      let sortOrder = 1;
      
      if (field.startsWith('-')) {
        sortField = field.substring(1);
        sortOrder = -1;
      }
      
      if (allowedSortFields.includes(sortField)) {
        sortObj[sortField] = sortOrder;
      }
    });
  }
  
  // Default sort
  if (Object.keys(sortObj).length === 0) {
    sortObj.createdAt = -1;
  }
  
  req.sort = sortObj;
  next();
};

// File upload validation
const validateFileUpload = (allowedMimeTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return next();
    }
    
    const files = Array.isArray(req.files.attachments) 
      ? req.files.attachments 
      : [req.files.attachments];
    
    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File ${file.name} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
        });
      }
      
      // Check MIME type
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File ${file.name} has invalid type. Allowed types: ${allowedMimeTypes.join(', ')}.`,
        });
      }
    }
    
    next();
  };
};

// Rate limiting headers
const addRateLimitHeaders = (req, res, next) => {
  // Add headers to show rate limit info
  res.setHeader('X-RateLimit-Limit', 100);
  res.setHeader('X-RateLimit-Remaining', 99); // This would be dynamic in real implementation
  res.setHeader('X-RateLimit-Reset', Date.now() + 15 * 60 * 1000);
  
  next();
};

module.exports = {
  validateRequest,
  sanitizeInput,
  validatePagination,
  validateSort,
  validateFileUpload,
  addRateLimitHeaders,
};
