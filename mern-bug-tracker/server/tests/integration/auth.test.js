// Integration tests for authentication endpoints
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { createTestUser, createTestAdmin, assertSuccessResponse, assertErrorResponse } = require('../helpers');

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    const validUserData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    };

    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      assertSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.role).toBe('reporter'); // default role
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should hash password correctly', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const user = await User.findOne({ email: validUserData.email }).select('+password');
      expect(user.password).not.toBe(validUserData.password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    test('should reject duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          username: 'different',
        });

      assertErrorResponse(response, 400, 'already exists');
    });

    test('should reject duplicate username', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      // Try to create second user with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'different@example.com',
        });

      assertErrorResponse(response, 400, 'already exists');
    });

    test('should validate required fields', async () => {
      const requiredFields = ['username', 'email', 'password', 'firstName', 'lastName'];

      for (const field of requiredFields) {
        const invalidData = { ...validUserData };
        delete invalidData[field];

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData);

        assertErrorResponse(response, 400);
      }
    });

    test('should validate email format', async () => {
      const invalidEmails = ['invalid', '@example.com', 'user@', 'user.example.com'];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            ...validUserData,
            email,
          });

        assertErrorResponse(response, 400);
      }
    });

    test('should validate username format', async () => {
      const invalidUsernames = ['a', 'a'.repeat(31), 'user name', 'user@name'];

      for (const username of invalidUsernames) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            ...validUserData,
            username,
          });

        assertErrorResponse(response, 400);
      }
    });

    test('should validate password strength', async () => {
      const weakPasswords = ['weak', '123456', 'password'];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            ...validUserData,
            password,
          });

        assertErrorResponse(response, 400);
      }
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      const userData = await createTestUser({
        email: 'login@example.com',
        password: 'Password123!',
      });
      testUser = userData.user;
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('login@example.com');
      expect(response.body.data.user).toHaveProperty('lastLogin');
    });

    test('should update lastLogin timestamp', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastLogin).toBeInstanceOf(Date);
      expect(updatedUser.lastLogin.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'Password123!',
        });

      assertErrorResponse(response, 401, 'Invalid credentials');
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      assertErrorResponse(response, 401, 'Invalid credentials');
    });

    test('should reject inactive user', async () => {
      // Deactivate user
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!',
        });

      assertErrorResponse(response, 401, 'Invalid credentials');
    });

    test('should validate required fields', async () => {
      const testCases = [
        { email: '', password: 'password' },
        { email: 'test@example.com', password: '' },
        { password: 'password' }, // missing email
        { email: 'test@example.com' }, // missing password
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(testCase);

        assertErrorResponse(response, 400);
      }
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser, token;

    beforeEach(async () => {
      const userData = await createTestUser();
      testUser = userData.user;
      token = userData.token;
    });

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.user.id).toBe(testUser._id.toString());
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      assertErrorResponse(response, 401, 'No token provided');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      assertErrorResponse(response, 401, 'invalid');
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testUser, token;

    beforeEach(async () => {
      const userData = await createTestUser();
      testUser = userData.user;
      token = userData.token;
    });

    test('should update profile successfully', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        avatar: 'https://example.com/avatar.jpg',
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      assertSuccessResponse(response, 200);
      expect(response.body.data.user.firstName).toBe(updates.firstName);
      expect(response.body.data.user.lastName).toBe(updates.lastName);
      expect(response.body.data.user.avatar).toBe(updates.avatar);
    });

    test('should ignore non-allowed fields', async () => {
      const updates = {
        firstName: 'Updated',
        email: 'newemail@example.com', // not allowed
        role: 'admin', // not allowed
        password: 'newpassword', // not allowed
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updates);

      assertSuccessResponse(response, 200);
      expect(response.body.data.user.firstName).toBe(updates.firstName);
      expect(response.body.data.user.email).toBe(testUser.email); // unchanged
      expect(response.body.data.user.role).toBe(testUser.role); // unchanged
    });

    test('should reject invalid avatar URL', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          avatar: 'not-a-url',
        });

      assertErrorResponse(response, 400);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          firstName: 'Updated',
        });

      assertErrorResponse(response, 401, 'No token provided');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let testUser, token;
    const currentPassword = 'Password123!';

    beforeEach(async () => {
      const userData = await createTestUser({ password: currentPassword });
      testUser = userData.user;
      token = userData.token;
    });

    test('should change password successfully', async () => {
      const newPassword = 'NewPassword123!';
      
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword,
          newPassword,
        });

      assertSuccessResponse(response, 200);

      // Verify password was changed by trying to login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        });

      assertSuccessResponse(loginResponse, 200);
    });

    test('should reject incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!',
        });

      assertErrorResponse(response, 400, 'Current password is incorrect');
    });

    test('should validate new password strength', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword,
          newPassword: 'weak',
        });

      assertErrorResponse(response, 400, 'strength requirements');
    });

    test('should require both passwords', async () => {
      const testCases = [
        { currentPassword },
        { newPassword: 'NewPassword123!' },
        {},
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .put('/api/auth/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send(testCase);

        assertErrorResponse(response, 400);
      }
    });
  });

  describe('Admin Routes', () => {
    let adminUser, adminToken, regularUser, regularToken;

    beforeEach(async () => {
      const adminData = await createTestAdmin();
      adminUser = adminData.user;
      adminToken = adminData.token;

      const userData = await createTestUser({
        username: 'regular',
        email: 'regular@example.com',
      });
      regularUser = userData.user;
      regularToken = userData.token;
    });

    describe('GET /api/auth/users', () => {
      test('should allow admin to get all users', async () => {
        const response = await request(app)
          .get('/api/auth/users')
          .set('Authorization', `Bearer ${adminToken}`);

        assertSuccessResponse(response, 200);
        expect(response.body.data.users).toBeInstanceOf(Array);
        expect(response.body.data.users.length).toBeGreaterThan(0);
        expect(response.body.data.pagination).toBeDefined();
      });

      test('should deny access to non-admin users', async () => {
        const response = await request(app)
          .get('/api/auth/users')
          .set('Authorization', `Bearer ${regularToken}`);

        assertErrorResponse(response, 403, 'Access denied');
      });

      test('should support filtering by role', async () => {
        const response = await request(app)
          .get('/api/auth/users?role=admin')
          .set('Authorization', `Bearer ${adminToken}`);

        assertSuccessResponse(response, 200);
        response.body.data.users.forEach(user => {
          expect(user.role).toBe('admin');
        });
      });
    });

    describe('PUT /api/auth/users/:id/role', () => {
      test('should allow admin to update user role', async () => {
        const response = await request(app)
          .put(`/api/auth/users/${regularUser._id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'developer' });

        assertSuccessResponse(response, 200);
        expect(response.body.data.user.role).toBe('developer');
      });

      test('should deny access to non-admin users', async () => {
        const response = await request(app)
          .put(`/api/auth/users/${regularUser._id}/role`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({ role: 'developer' });

        assertErrorResponse(response, 403, 'Access denied');
      });

      test('should reject invalid roles', async () => {
        const response = await request(app)
          .put(`/api/auth/users/${regularUser._id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'invalid' });

        assertErrorResponse(response, 400);
      });
    });

    describe('PUT /api/auth/users/:id/deactivate', () => {
      test('should allow admin to deactivate user', async () => {
        const response = await request(app)
          .put(`/api/auth/users/${regularUser._id}/deactivate`)
          .set('Authorization', `Bearer ${adminToken}`);

        assertSuccessResponse(response, 200);
        expect(response.body.data.user.isActive).toBe(false);
      });

      test('should deny access to non-admin users', async () => {
        const response = await request(app)
          .put(`/api/auth/users/${regularUser._id}/deactivate`)
          .set('Authorization', `Bearer ${regularToken}`);

        assertErrorResponse(response, 403, 'Access denied');
      });
    });
  });
});
