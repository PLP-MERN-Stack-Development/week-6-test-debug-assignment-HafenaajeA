// Unit tests for validation utilities
const {
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
} = require('../../src/utils/validation');

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user.example.com',
        'user@.com',
        '',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePasswordStrength', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'C0mplex$Password',
      ];

      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.strength).toBeGreaterThan(3);
      });
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        { password: 'weak', expectedErrors: 4 },
        { password: '1234567', expectedErrors: 3 },
        { password: 'password', expectedErrors: 2 },
        { password: 'PASSWORD', expectedErrors: 2 },
        { password: 'Password', expectedErrors: 1 },
      ];

      weakPasswords.forEach(({ password, expectedErrors }) => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(expectedErrors);
      });
    });

    test('should calculate password strength correctly', () => {
      expect(calculatePasswordStrength('weak')).toBeLessThan(3);
      expect(calculatePasswordStrength('Password123!')).toBeGreaterThan(4);
      expect(calculatePasswordStrength('VeryLongAndComplexPassword123!')).toBe(5);
    });
  });

  describe('validateUsername', () => {
    test('should validate correct usernames', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'my-username',
        'user',
        'a'.repeat(30), // max length
      ];

      validUsernames.forEach(username => {
        const result = validateUsername(username);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid usernames', () => {
      const invalidUsernames = [
        '',
        'ab', // too short
        'a'.repeat(31), // too long
        'user name', // contains space
        'user@name', // contains @
        'user.name', // contains dot
        'user#name', // contains special char
      ];

      invalidUsernames.forEach(username => {
        const result = validateUsername(username);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateBugTitle', () => {
    test('should validate correct bug titles', () => {
      const validTitles = [
        'Bug in login form',
        'Application crashes on startup',
        'a'.repeat(200), // max length
      ];

      validTitles.forEach(title => {
        const result = validateBugTitle(title);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid bug titles', () => {
      const invalidTitles = [
        '',
        '   ', // only whitespace
        'a'.repeat(201), // too long
        null,
        undefined,
      ];

      invalidTitles.forEach(title => {
        const result = validateBugTitle(title);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validatePriority', () => {
    test('should validate correct priorities', () => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      
      validPriorities.forEach(priority => {
        expect(validatePriority(priority)).toBe(true);
      });
    });

    test('should reject invalid priorities', () => {
      const invalidPriorities = ['urgent', 'normal', '', null, undefined];
      
      invalidPriorities.forEach(priority => {
        expect(validatePriority(priority)).toBe(false);
      });
    });
  });

  describe('validateStatus', () => {
    test('should validate correct statuses', () => {
      const validStatuses = ['open', 'in-progress', 'testing', 'resolved', 'closed'];
      
      validStatuses.forEach(status => {
        expect(validateStatus(status)).toBe(true);
      });
    });

    test('should reject invalid statuses', () => {
      const invalidStatuses = ['pending', 'done', '', null, undefined];
      
      invalidStatuses.forEach(status => {
        expect(validateStatus(status)).toBe(false);
      });
    });
  });

  describe('validateStatusTransition', () => {
    test('should allow valid status transitions', () => {
      const validTransitions = [
        ['open', 'in-progress'],
        ['in-progress', 'testing'],
        ['testing', 'resolved'],
        ['resolved', 'closed'],
        ['closed', 'open'], // reopening
      ];

      validTransitions.forEach(([from, to]) => {
        expect(validateStatusTransition(from, to)).toBe(true);
      });
    });

    test('should reject invalid status transitions', () => {
      const invalidTransitions = [
        ['open', 'resolved'], // skip steps
        ['open', 'testing'],
        ['in-progress', 'closed'], // skip testing
        ['testing', 'closed'], // skip resolved
      ];

      invalidTransitions.forEach(([from, to]) => {
        expect(validateStatusTransition(from, to)).toBe(false);
      });
    });
  });

  describe('sanitizeHtml', () => {
    test('should sanitize HTML characters', () => {
      const testCases = [
        { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;' },
        { input: 'Hello & welcome', expected: 'Hello &amp; welcome' },
        { input: 'Test "quotes" & \'apostrophes\'', expected: 'Test &quot;quotes&quot; &amp; &#x27;apostrophes&#x27;' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeHtml(input)).toBe(expected);
      });
    });

    test('should handle non-string inputs', () => {
      expect(sanitizeHtml(123)).toBe(123);
      expect(sanitizeHtml(null)).toBe(null);
      expect(sanitizeHtml(undefined)).toBe(undefined);
    });
  });

  describe('isValidObjectId', () => {
    test('should validate correct ObjectIds', () => {
      const validIds = [
        '507f1f77bcf86cd799439011',
        '507f191e810c19729de860ea',
        '000000000000000000000000',
      ];

      validIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(true);
      });
    });

    test('should reject invalid ObjectIds', () => {
      const invalidIds = [
        'invalid',
        '507f1f77bcf86cd79943901', // too short
        '507f1f77bcf86cd799439011x', // too long
        'gggggggggggggggggggggggg', // invalid chars
        '',
        null,
        undefined,
      ];

      invalidIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(false);
      });
    });
  });

  describe('generateSlug', () => {
    test('should generate valid slugs', () => {
      const testCases = [
        { input: 'Hello World', expected: 'hello-world' },
        { input: 'Bug in Login Form!', expected: 'bug-in-login-form' },
        { input: 'Multiple   Spaces', expected: 'multiple-spaces' },
        { input: 'Special @#$% Characters', expected: 'special-characters' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(generateSlug(input)).toBe(expected);
      });
    });

    test('should limit slug length', () => {
      const longText = 'a'.repeat(100);
      const slug = generateSlug(longText);
      expect(slug.length).toBeLessThanOrEqual(50);
    });
  });

  describe('formatDate', () => {
    test('should format dates correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2023-12-25');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('25/12/2023');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('12/25/2023');
    });

    test('should handle invalid dates', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
    });
  });

  describe('timeAgo', () => {
    test('should calculate time differences correctly', () => {
      const now = new Date();
      
      // Just now
      expect(timeAgo(now)).toBe('just now');
      
      // Minutes ago
      const minutesAgo = new Date(now - 5 * 60 * 1000);
      expect(timeAgo(minutesAgo)).toBe('5 minutes ago');
      
      // Hours ago
      const hoursAgo = new Date(now - 2 * 60 * 60 * 1000);
      expect(timeAgo(hoursAgo)).toBe('2 hours ago');
      
      // Days ago
      const daysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      expect(timeAgo(daysAgo)).toBe('3 days ago');
    });
  });
});
