// tests/unit/middleware.test.js - Unit tests for middleware functions

const { validateBug, validateUser } = require('../../src/middleware/validation');
const { authenticate, authorize } = require('../../src/middleware/auth');
const errorHandler = require('../../src/middleware/errorHandler');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('jsonwebtoken');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateBug', () => {
    it('should pass validation for valid bug data', () => {
      req.body = {
        title: 'Valid Bug Title',
        description: 'Valid bug description that is long enough',
        severity: 'high',
        priority: 'medium',
        category: 'frontend'
      };

      validateBug(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation for missing title', () => {
      req.body = {
        description: 'Valid description',
        severity: 'high',
        priority: 'medium'
      };

      validateBug(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: 'Title is required'
          })
        ])
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail validation for short description', () => {
      req.body = {
        title: 'Valid Title',
        description: 'Short',
        severity: 'high',
        priority: 'medium'
      };

      validateBug(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'description',
            message: 'Description must be at least 10 characters long'
          })
        ])
      });
    });

    it('should fail validation for invalid severity', () => {
      req.body = {
        title: 'Valid Title',
        description: 'Valid description',
        severity: 'invalid',
        priority: 'medium'
      };

      validateBug(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'severity',
            message: 'Severity must be one of: low, medium, high, critical'
          })
        ])
      });
    });

    it('should sanitize XSS attempts in title', () => {
      req.body = {
        title: '<script>alert("xss")</script>Valid Title',
        description: 'Valid description',
        severity: 'medium',
        priority: 'medium'
      };

      validateBug(req, res, next);

      expect(req.body.title).toBe('Valid Title');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should pass validation for valid user data', () => {
      req.body = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'validpassword123',
        role: 'developer'
      };

      validateUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation for invalid email', () => {
      req.body = {
        username: 'validuser',
        email: 'invalid-email',
        password: 'validpassword123',
        role: 'developer'
      };

      validateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Please provide a valid email address'
          })
        ])
      });
    });

    it('should fail validation for weak password', () => {
      req.body = {
        username: 'validuser',
        email: 'valid@example.com',
        password: '123',
        role: 'developer'
      };

      validateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: 'Password must be at least 6 characters long'
          })
        ])
      });
    });
  });
});

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', () => {
      const mockUser = { id: 'user123', username: 'testuser' };
      req.headers.authorization = 'Bearer valid-token';
      
      jwt.verify.mockReturnValue(mockUser);

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', () => {
      req.headers.authorization = 'InvalidFormat token';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Invalid token format.'
      });
    });

    it('should reject request with expired token', () => {
      req.headers.authorization = 'Bearer expired-token';
      
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Token expired.'
      });
    });

    it('should reject request with malformed token', () => {
      req.headers.authorization = 'Bearer malformed-token';
      
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Invalid token.'
      });
    });
  });

  describe('authorize', () => {
    it('should authorize user with correct role', () => {
      req.user = { role: 'admin' };
      const authorizeAdmin = authorize(['admin']);

      authorizeAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authorize user with one of multiple allowed roles', () => {
      req.user = { role: 'developer' };
      const authorizeMultiple = authorize(['admin', 'developer']);

      authorizeMultiple(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user with insufficient role', () => {
      req.user = { role: 'tester' };
      const authorizeAdmin = authorize(['admin']);

      authorizeAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. Insufficient permissions.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without user object', () => {
      req.user = null;
      const authorizeAdmin = authorize(['admin']);

      authorizeAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied. User not authenticated.'
      });
    });
  });
});

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/api/test',
      method: 'GET'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('should handle general errors with 500 status', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  });

  it('should handle validation errors with 400 status', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      message: 'Validation failed'
    });
  });

  it('should handle MongoDB duplicate key errors', () => {
    const error = new Error('Duplicate key');
    error.code = 11000;
    error.keyPattern = { email: 1 };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Duplicate Entry',
      message: 'A record with this email already exists'
    });
  });

  it('should handle JWT errors', () => {
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  });

  it('should include stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'Test error',
      stack: 'Error stack trace'
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include stack trace in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    errorHandler(error, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'Test error'
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should log error details', () => {
    const error = new Error('Test error');

    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith(
      'Error occurred:',
      expect.objectContaining({
        message: 'Test error',
        url: '/api/test',
        method: 'GET'
      })
    );
  });
});
