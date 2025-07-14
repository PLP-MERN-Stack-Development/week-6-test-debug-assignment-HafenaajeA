// Integration tests for bug endpoints
const request = require('supertest');
const app = require('../../src/app');
const Bug = require('../../src/models/Bug');
const { 
  createTestUser, 
  createTestAdmin, 
  createTestDeveloper,
  createTestBug,
  createMultipleTestBugs,
  generateObjectId,
  assertSuccessResponse, 
  assertErrorResponse 
} = require('../helpers');

describe('Bug Endpoints', () => {
  let reporter, reporterToken;
  let developer, developerToken;
  let admin, adminToken;

  beforeEach(async () => {
    const reporterData = await createTestUser({ role: 'reporter' });
    reporter = reporterData.user;
    reporterToken = reporterData.token;

    const developerData = await createTestDeveloper();
    developer = developerData.user;
    developerToken = developerData.token;

    const adminData = await createTestAdmin();
    admin = adminData.user;
    adminToken = adminData.token;
  });

  describe('POST /api/bugs', () => {
    const validBugData = {
      title: 'Test Bug',
      description: 'This is a test bug description',
      priority: 'high',
      severity: 'major',
      category: 'bug',
      environment: 'production',
      stepsToReproduce: [
        { step: 'Open the application', order: 1 },
        { step: 'Click on login button', order: 2 },
        { step: 'Enter invalid credentials', order: 3 },
      ],
      expectedResult: 'Should show error message',
      actualResult: 'Application crashes',
      tags: ['login', 'crash'],
    };

    test('should create bug successfully', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send(validBugData);

      assertSuccessResponse(response, 201);
      expect(response.body.data.bug.title).toBe(validBugData.title);
      expect(response.body.data.bug.reporter._id).toBe(reporter._id.toString());
      expect(response.body.data.bug.status).toBe('open'); // default status
    });

    test('should set reporter to current user', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send(validBugData);

      assertSuccessResponse(response, 201);
      expect(response.body.data.bug.reporter._id).toBe(reporter._id.toString());
    });

    test('should sort steps to reproduce by order', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          ...validBugData,
          stepsToReproduce: [
            { step: 'Third step', order: 3 },
            { step: 'First step', order: 1 },
            { step: 'Second step', order: 2 },
          ],
        });

      assertSuccessResponse(response, 201);
      const steps = response.body.data.bug.stepsToReproduce;
      expect(steps[0].order).toBe(1);
      expect(steps[1].order).toBe(2);
      expect(steps[2].order).toBe(3);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .send(validBugData);

      assertErrorResponse(response, 401, 'No token provided');
    });

    test('should validate required fields', async () => {
      const requiredFields = ['title', 'description'];

      for (const field of requiredFields) {
        const invalidData = { ...validBugData };
        delete invalidData[field];

        const response = await request(app)
          .post('/api/bugs')
          .set('Authorization', `Bearer ${reporterToken}`)
          .send(invalidData);

        assertErrorResponse(response, 400);
      }
    });

    test('should validate field lengths', async () => {
      const testCases = [
        { title: 'a'.repeat(201), description: 'valid' }, // title too long
        { title: 'valid', description: 'a'.repeat(2001) }, // description too long
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/bugs')
          .set('Authorization', `Bearer ${reporterToken}`)
          .send(testCase);

        assertErrorResponse(response, 400);
      }
    });

    test('should validate enum values', async () => {
      const testCases = [
        { priority: 'invalid' },
        { severity: 'invalid' },
        { category: 'invalid' },
        { environment: 'invalid' },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/bugs')
          .set('Authorization', `Bearer ${reporterToken}`)
          .send({ ...validBugData, ...testCase });

        assertErrorResponse(response, 400);
      }
    });
  });

  describe('GET /api/bugs', () => {
    beforeEach(async () => {
      await createMultipleTestBugs(reporter._id, 15);
    });

    test('should get all bugs', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.bugs).toBeInstanceOf(Array);
      expect(response.body.data.bugs.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should support pagination', async () => {
      const page1 = await request(app)
        .get('/api/bugs?page=1&limit=5')
        .set('Authorization', `Bearer ${reporterToken}`);

      const page2 = await request(app)
        .get('/api/bugs?page=2&limit=5')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(page1, 200);
      assertSuccessResponse(page2, 200);
      expect(page1.body.data.bugs.length).toBe(5);
      expect(page2.body.data.bugs.length).toBe(5);
      expect(page1.body.data.bugs[0]._id).not.toBe(page2.body.data.bugs[0]._id);
    });

    test('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/bugs?status=open')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      response.body.data.bugs.forEach(bug => {
        expect(bug.status).toBe('open');
      });
    });

    test('should support filtering by priority', async () => {
      const response = await request(app)
        .get('/api/bugs?priority=high')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      response.body.data.bugs.forEach(bug => {
        expect(bug.priority).toBe('high');
      });
    });

    test('should support filtering by reporter', async () => {
      const response = await request(app)
        .get(`/api/bugs?reporter=${reporter._id}`)
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      response.body.data.bugs.forEach(bug => {
        expect(bug.reporter._id).toBe(reporter._id.toString());
      });
    });

    test('should support sorting', async () => {
      const response = await request(app)
        .get('/api/bugs?sort=createdAt')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      const bugs = response.body.data.bugs;
      for (let i = 1; i < bugs.length; i++) {
        const prevDate = new Date(bugs[i - 1].createdAt);
        const currDate = new Date(bugs[i].createdAt);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });

    test('should populate related fields', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      const bug = response.body.data.bugs[0];
      expect(bug.reporter).toHaveProperty('username');
      expect(bug.reporter).toHaveProperty('email');
      expect(bug.reporter).not.toHaveProperty('password');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/bugs');

      assertErrorResponse(response, 401, 'No token provided');
    });
  });

  describe('GET /api/bugs/:id', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await createTestBug(reporter._id);
    });

    test('should get bug by ID', async () => {
      const response = await request(app)
        .get(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.bug._id).toBe(testBug._id.toString());
      expect(response.body.data.bug.title).toBe(testBug.title);
    });

    test('should populate all related fields', async () => {
      const response = await request(app)
        .get(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      const bug = response.body.data.bug;
      expect(bug.reporter).toHaveProperty('username');
      expect(bug.reporter).toHaveProperty('role');
    });

    test('should return 404 for non-existent bug', async () => {
      const nonExistentId = generateObjectId();
      const response = await request(app)
        .get(`/api/bugs/${nonExistentId}`)
        .set('Authorization', `Bearer ${reporterToken}`);

      assertErrorResponse(response, 404, 'Bug not found');
    });

    test('should return 400 for invalid bug ID', async () => {
      const response = await request(app)
        .get('/api/bugs/invalid-id')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertErrorResponse(response, 400, 'Invalid bug ID');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/bugs/${testBug._id}`);

      assertErrorResponse(response, 401, 'No token provided');
    });
  });

  describe('PUT /api/bugs/:id', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await createTestBug(reporter._id);
    });

    test('should allow reporter to update their bug', async () => {
      const updates = {
        title: 'Updated Bug Title',
        description: 'Updated description',
        priority: 'critical',
      };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send(updates);

      assertSuccessResponse(response, 200);
      expect(response.body.data.bug.title).toBe(updates.title);
      expect(response.body.data.bug.description).toBe(updates.description);
      expect(response.body.data.bug.priority).toBe(updates.priority);
    });

    test('should allow assignee to update bug', async () => {
      // Assign bug to developer
      testBug.assignee = developer._id;
      await testBug.save();

      const updates = { status: 'in-progress' };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send(updates);

      assertSuccessResponse(response, 200);
      expect(response.body.data.bug.status).toBe(updates.status);
    });

    test('should allow admin to update any bug', async () => {
      const updates = { priority: 'critical' };

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      assertSuccessResponse(response, 200);
      expect(response.body.data.bug.priority).toBe(updates.priority);
    });

    test('should deny unauthorized users', async () => {
      const otherUser = await createTestUser({
        username: 'other',
        email: 'other@example.com',
      });

      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({ title: 'Unauthorized update' });

      assertErrorResponse(response, 403, 'modify bugs');
    });

    test('should validate status transitions', async () => {
      // Try invalid transition from 'open' to 'resolved'
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({ status: 'resolved' });

      assertErrorResponse(response, 400, 'Invalid status transition');
    });

    test('should prevent updating read-only fields', async () => {
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          title: 'Updated Title',
          reporter: generateObjectId(), // should be ignored
          createdAt: new Date(), // should be ignored
        });

      assertSuccessResponse(response, 200);
      expect(response.body.data.bug.title).toBe('Updated Title');
      expect(response.body.data.bug.reporter._id).toBe(reporter._id.toString());
    });
  });

  describe('DELETE /api/bugs/:id', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await createTestBug(reporter._id);
    });

    test('should allow reporter to delete their bug', async () => {
      const response = await request(app)
        .delete(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);

      // Verify bug is deleted
      const deletedBug = await Bug.findById(testBug._id);
      expect(deletedBug).toBeNull();
    });

    test('should allow admin to delete any bug', async () => {
      const response = await request(app)
        .delete(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      assertSuccessResponse(response, 200);
    });

    test('should deny unauthorized users', async () => {
      const response = await request(app)
        .delete(`/api/bugs/${testBug._id}`)
        .set('Authorization', `Bearer ${developerToken}`);

      assertErrorResponse(response, 403, 'only delete bugs you reported');
    });

    test('should return 404 for non-existent bug', async () => {
      const nonExistentId = generateObjectId();
      const response = await request(app)
        .delete(`/api/bugs/${nonExistentId}`)
        .set('Authorization', `Bearer ${reporterToken}`);

      assertErrorResponse(response, 404, 'Bug not found');
    });
  });

  describe('PUT /api/bugs/:id/assign', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await createTestBug(reporter._id);
    });

    test('should allow developer to assign bug', async () => {
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}/assign`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ assigneeId: developer._id });

      assertSuccessResponse(response, 200);
      expect(response.body.data.bug.assignee._id).toBe(developer._id.toString());
    });

    test('should allow admin to assign bug', async () => {
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: developer._id });

      assertSuccessResponse(response, 200);
      expect(response.body.data.bug.assignee._id).toBe(developer._id.toString());
    });

    test('should deny reporter from assigning bugs', async () => {
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}/assign`)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({ assigneeId: developer._id });

      assertErrorResponse(response, 403, 'Access denied');
    });

    test('should validate assignee exists', async () => {
      const nonExistentId = generateObjectId();
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}/assign`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ assigneeId: nonExistentId });

      assertErrorResponse(response, 404, 'Assignee not found');
    });

    test('should validate assignee role', async () => {
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}/assign`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ assigneeId: reporter._id });

      assertErrorResponse(response, 400, 'must be a developer or admin');
    });
  });

  describe('POST /api/bugs/:id/comments', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await createTestBug(reporter._id);
    });

    test('should add comment successfully', async () => {
      const commentContent = 'This is a test comment';
      const response = await request(app)
        .post(`/api/bugs/${testBug._id}/comments`)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({ content: commentContent });

      assertSuccessResponse(response, 201);
      expect(response.body.data.comment.content).toBe(commentContent);
      expect(response.body.data.comment.author.username).toBe(reporter.username);
    });

    test('should validate comment content', async () => {
      const testCases = [
        { content: '' },
        { content: '   ' }, // only whitespace
        { content: 'a'.repeat(1001) }, // too long
        {}, // missing content
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post(`/api/bugs/${testBug._id}/comments`)
          .set('Authorization', `Bearer ${reporterToken}`)
          .send(testCase);

        assertErrorResponse(response, 400);
      }
    });

    test('should return 404 for non-existent bug', async () => {
      const nonExistentId = generateObjectId();
      const response = await request(app)
        .post(`/api/bugs/${nonExistentId}/comments`)
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({ content: 'Test comment' });

      assertErrorResponse(response, 404, 'Bug not found');
    });
  });

  describe('PUT /api/bugs/:id/watch', () => {
    let testBug;

    beforeEach(async () => {
      testBug = await createTestBug(reporter._id);
    });

    test('should add user as watcher', async () => {
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}/watch`)
        .set('Authorization', `Bearer ${developerToken}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.isWatching).toBe(true);
      expect(response.body.data.watchersCount).toBe(1);
    });

    test('should remove user as watcher when already watching', async () => {
      // First, add as watcher
      await request(app)
        .put(`/api/bugs/${testBug._id}/watch`)
        .set('Authorization', `Bearer ${developerToken}`);

      // Then remove
      const response = await request(app)
        .put(`/api/bugs/${testBug._id}/watch`)
        .set('Authorization', `Bearer ${developerToken}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.isWatching).toBe(false);
      expect(response.body.data.watchersCount).toBe(0);
    });
  });

  describe('GET /api/bugs/statistics', () => {
    beforeEach(async () => {
      // Create bugs with different statuses and priorities
      await createTestBug(reporter._id, { status: 'open', priority: 'high' });
      await createTestBug(reporter._id, { status: 'in-progress', priority: 'medium' });
      await createTestBug(reporter._id, { status: 'resolved', priority: 'low' });
      await createTestBug(reporter._id, { status: 'closed', priority: 'critical' });
    });

    test('should return bug statistics', async () => {
      const response = await request(app)
        .get('/api/bugs/statistics')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.statistics).toHaveProperty('total');
      expect(response.body.data.statistics).toHaveProperty('open');
      expect(response.body.data.statistics).toHaveProperty('inProgress');
      expect(response.body.data.statistics).toHaveProperty('resolved');
      expect(response.body.data.statistics).toHaveProperty('closed');
      expect(response.body.data.statistics).toHaveProperty('critical');
      expect(response.body.data.statistics).toHaveProperty('high');
      expect(response.body.data.statistics).toHaveProperty('medium');
      expect(response.body.data.statistics).toHaveProperty('low');
      expect(response.body.data.recentBugs).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/bugs/my-assigned', () => {
    beforeEach(async () => {
      // Create bugs assigned to developer
      const bug1 = await createTestBug(reporter._id);
      const bug2 = await createTestBug(reporter._id);
      bug1.assignee = developer._id;
      bug2.assignee = developer._id;
      await bug1.save();
      await bug2.save();

      // Create unassigned bug
      await createTestBug(reporter._id);
    });

    test('should return only assigned bugs', async () => {
      const response = await request(app)
        .get('/api/bugs/my-assigned')
        .set('Authorization', `Bearer ${developerToken}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.bugs).toBeInstanceOf(Array);
      response.body.data.bugs.forEach(bug => {
        expect(bug.assignee).toBe(developer._id.toString());
      });
    });
  });

  describe('GET /api/bugs/my-reported', () => {
    beforeEach(async () => {
      await createMultipleTestBugs(reporter._id, 3);
      await createMultipleTestBugs(developer._id, 2);
    });

    test('should return only reported bugs', async () => {
      const response = await request(app)
        .get('/api/bugs/my-reported')
        .set('Authorization', `Bearer ${reporterToken}`);

      assertSuccessResponse(response, 200);
      expect(response.body.data.bugs).toBeInstanceOf(Array);
      expect(response.body.data.bugs.length).toBe(3);
      response.body.data.bugs.forEach(bug => {
        expect(bug.reporter._id).toBe(reporter._id.toString());
      });
    });
  });
});
