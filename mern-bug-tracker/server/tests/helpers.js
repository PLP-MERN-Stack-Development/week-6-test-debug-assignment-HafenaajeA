// Test utilities and helpers
const User = require('../src/models/User');
const Bug = require('../src/models/Bug');
const { generateToken } = require('../src/utils/auth');
const mongoose = require('mongoose');

// Create test user
const createTestUser = async (userData = {}) => {
  const defaultUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'reporter',
  };

  const user = await User.create({ ...defaultUserData, ...userData });
  const token = generateToken(user);
  
  return { user, token };
};

// Create test admin
const createTestAdmin = async (userData = {}) => {
  const adminData = {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  };

  return createTestUser({ ...adminData, ...userData });
};

// Create test developer
const createTestDeveloper = async (userData = {}) => {
  const developerData = {
    username: 'developer',
    email: 'dev@example.com',
    password: 'dev123',
    firstName: 'Developer',
    lastName: 'User',
    role: 'developer',
  };

  return createTestUser({ ...developerData, ...userData });
};

// Create test bug
const createTestBug = async (reporterId, bugData = {}) => {
  const defaultBugData = {
    title: 'Test Bug',
    description: 'This is a test bug description',
    priority: 'medium',
    severity: 'major',
    category: 'bug',
    environment: 'development',
    reporter: reporterId,
  };

  return await Bug.create({ ...defaultBugData, ...bugData });
};

// Create multiple test bugs
const createMultipleTestBugs = async (reporterId, count = 5) => {
  const bugs = [];
  for (let i = 0; i < count; i++) {
    const bug = await createTestBug(reporterId, {
      title: `Test Bug ${i + 1}`,
      description: `Description for test bug ${i + 1}`,
      priority: ['low', 'medium', 'high', 'critical'][i % 4],
      status: ['open', 'in-progress', 'testing', 'resolved', 'closed'][i % 5],
    });
    bugs.push(bug);
  }
  return bugs;
};

// Generate valid ObjectId
const generateObjectId = () => {
  return new mongoose.Types.ObjectId();
};

// Mock request object
const mockRequest = (options = {}) => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    pagination: options.pagination || { page: 1, limit: 10, skip: 0 },
    sort: options.sort || { createdAt: -1 },
    ...options,
  };
};

// Mock response object
const mockResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    setHeader: jest.fn(() => res),
  };
  return res;
};

// Mock next function
const mockNext = jest.fn();

// Clean all collections
const cleanDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Delay function for testing async operations
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Assert response format
const assertSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
};

const assertErrorResponse = (response, statusCode, errorMessage = null) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
};

// Password validation test data
const passwordTestCases = {
  weak: 'weak',
  short: '12345',
  noUppercase: 'password123',
  noLowercase: 'PASSWORD123',
  noNumber: 'Password',
  noSpecial: 'Password123',
  strong: 'Password123!',
};

// Bug status transition test data
const statusTransitions = {
  valid: [
    { from: 'open', to: 'in-progress' },
    { from: 'open', to: 'closed' },
    { from: 'in-progress', to: 'testing' },
    { from: 'in-progress', to: 'open' },
    { from: 'in-progress', to: 'closed' },
    { from: 'testing', to: 'resolved' },
    { from: 'testing', to: 'in-progress' },
    { from: 'testing', to: 'open' },
    { from: 'resolved', to: 'closed' },
    { from: 'resolved', to: 'open' },
    { from: 'closed', to: 'open' },
  ],
  invalid: [
    { from: 'open', to: 'testing' },
    { from: 'open', to: 'resolved' },
    { from: 'in-progress', to: 'resolved' },
    { from: 'testing', to: 'closed' },
    { from: 'resolved', to: 'in-progress' },
    { from: 'resolved', to: 'testing' },
    { from: 'closed', to: 'in-progress' },
    { from: 'closed', to: 'testing' },
    { from: 'closed', to: 'resolved' },
  ],
};

module.exports = {
  createTestUser,
  createTestAdmin,
  createTestDeveloper,
  createTestBug,
  createMultipleTestBugs,
  generateObjectId,
  mockRequest,
  mockResponse,
  mockNext,
  cleanDatabase,
  delay,
  assertSuccessResponse,
  assertErrorResponse,
  passwordTestCases,
  statusTransitions,
};
