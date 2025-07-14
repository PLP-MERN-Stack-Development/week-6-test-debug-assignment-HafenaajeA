// Unit tests for authentication utilities
const {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  generatePasswordResetToken,
  hashPasswordResetToken,
  hasRole,
  canAccessResource,
  validateApiKey,
} = require('../../src/utils/auth');
const { createTestUser, createTestBug, generateObjectId } = require('../helpers');

describe('Authentication Utilities', () => {
  describe('generateToken', () => {
    test('should generate a valid JWT token', async () => {
      const { user } = await createTestUser();
      const token = generateToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should include user information in token payload', async () => {
      const { user } = await createTestUser();
      const token = generateToken(user);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(user._id.toString());
      expect(decoded.username).toBe(user.username);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });
  });

  describe('verifyToken', () => {
    test('should verify a valid token', async () => {
      const { user } = await createTestUser();
      const token = generateToken(user);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(user._id.toString());
    });

    test('should throw error for invalid token', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow('Invalid token');
    });

    test('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      
      expect(() => {
        verifyToken(malformedToken);
      }).toThrow('Invalid token');
    });
  });

  describe('extractTokenFromHeader', () => {
    test('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;
      
      const extractedToken = extractTokenFromHeader(authHeader);
      expect(extractedToken).toBe(token);
    });

    test('should return null for missing header', () => {
      expect(extractTokenFromHeader(null)).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
    });

    test('should return null for invalid header format', () => {
      const invalidHeaders = [
        'InvalidHeader',
        'Bearer',
        'Basic dGVzdDp0ZXN0',
        'Bearer token1 token2',
      ];

      invalidHeaders.forEach(header => {
        expect(extractTokenFromHeader(header)).toBeNull();
      });
    });
  });

  describe('generatePasswordResetToken', () => {
    test('should generate a password reset token', () => {
      const token = generatePasswordResetToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    test('should generate unique tokens', () => {
      const token1 = generatePasswordResetToken();
      const token2 = generatePasswordResetToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashPasswordResetToken', () => {
    test('should hash password reset token', () => {
      const token = 'test-reset-token';
      const hashedToken = hashPasswordResetToken(token);
      
      expect(hashedToken).toBeDefined();
      expect(typeof hashedToken).toBe('string');
      expect(hashedToken).not.toBe(token);
      expect(hashedToken.length).toBe(64); // SHA256 hex output
    });

    test('should produce consistent hashes', () => {
      const token = 'test-reset-token';
      const hash1 = hashPasswordResetToken(token);
      const hash2 = hashPasswordResetToken(token);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('hasRole', () => {
    test('should check single role correctly', () => {
      expect(hasRole('admin', 'admin')).toBe(true);
      expect(hasRole('user', 'admin')).toBe(false);
    });

    test('should check multiple roles correctly', () => {
      const allowedRoles = ['admin', 'moderator'];
      
      expect(hasRole('admin', allowedRoles)).toBe(true);
      expect(hasRole('moderator', allowedRoles)).toBe(true);
      expect(hasRole('user', allowedRoles)).toBe(false);
    });

    test('should handle invalid inputs', () => {
      expect(hasRole('admin', null)).toBe(false);
      expect(hasRole('admin', undefined)).toBe(false);
      expect(hasRole('admin', {})).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    let reporter, developer, admin, bug;

    beforeEach(async () => {
      const reporterData = await createTestUser({ role: 'reporter' });
      const developerData = await createTestUser({ 
        username: 'dev', 
        email: 'dev@test.com', 
        role: 'developer' 
      });
      const adminData = await createTestUser({ 
        username: 'admin', 
        email: 'admin@test.com', 
        role: 'admin' 
      });

      reporter = reporterData.user;
      developer = developerData.user;
      admin = adminData.user;

      bug = await createTestBug(reporter._id);
    });

    describe('Bug access control', () => {
      test('should allow admin to access all bug actions', () => {
        expect(canAccessResource(admin, bug, 'read')).toBe(true);
        expect(canAccessResource(admin, bug, 'create')).toBe(true);
        expect(canAccessResource(admin, bug, 'update')).toBe(true);
        expect(canAccessResource(admin, bug, 'delete')).toBe(true);
      });

      test('should allow everyone to read bugs', () => {
        expect(canAccessResource(reporter, bug, 'read')).toBe(true);
        expect(canAccessResource(developer, bug, 'read')).toBe(true);
      });

      test('should allow authorized roles to create bugs', () => {
        expect(canAccessResource(reporter, bug, 'create')).toBe(true);
        expect(canAccessResource(developer, bug, 'create')).toBe(true);
      });

      test('should allow reporter to update and delete their own bugs', () => {
        expect(canAccessResource(reporter, bug, 'update')).toBe(true);
        expect(canAccessResource(reporter, bug, 'delete')).toBe(true);
      });

      test('should allow assignee to update bugs', async () => {
        bug.assignee = developer._id;
        expect(canAccessResource(developer, bug, 'update')).toBe(true);
      });

      test('should deny unauthorized actions', () => {
        expect(canAccessResource(developer, bug, 'delete')).toBe(false);
        expect(canAccessResource(developer, bug, 'update')).toBe(false);
      });
    });

    describe('User access control', () => {
      test('should allow admin to manage all users', () => {
        expect(canAccessResource(admin, reporter, 'read')).toBe(true);
        expect(canAccessResource(admin, reporter, 'update')).toBe(true);
        expect(canAccessResource(admin, reporter, 'delete')).toBe(true);
      });

      test('should allow everyone to read user info', () => {
        expect(canAccessResource(reporter, developer, 'read')).toBe(true);
        expect(canAccessResource(developer, reporter, 'read')).toBe(true);
      });

      test('should allow users to update their own profile', () => {
        expect(canAccessResource(reporter, reporter, 'update')).toBe(true);
        expect(canAccessResource(developer, developer, 'update')).toBe(true);
      });

      test('should deny unauthorized user actions', () => {
        expect(canAccessResource(reporter, developer, 'update')).toBe(false);
        expect(canAccessResource(reporter, developer, 'delete')).toBe(false);
        expect(canAccessResource(developer, reporter, 'delete')).toBe(false);
      });
    });

    test('should handle unknown resource types', () => {
      const unknownResource = { constructor: { modelName: 'Unknown' } };
      expect(canAccessResource(admin, unknownResource, 'read')).toBe(false);
    });
  });

  describe('validateApiKey', () => {
    test('should validate correct API key format', () => {
      const validApiKey = 'a'.repeat(32);
      expect(validateApiKey(validApiKey)).toBe(true);
    });

    test('should reject invalid API keys', () => {
      const invalidApiKeys = [
        '',
        'short',
        'a'.repeat(31), // too short
        'a'.repeat(33), // too long
        null,
        undefined,
      ];

      invalidApiKeys.forEach(apiKey => {
        expect(validateApiKey(apiKey)).toBe(false);
      });
    });
  });
});
