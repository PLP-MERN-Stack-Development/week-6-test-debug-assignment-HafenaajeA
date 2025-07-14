// Test setup file
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const logger = require('../src/config/logger');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  // Silence logger in test environment
  logger.silent = true;
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.disconnect();
  
  // Stop in-memory MongoDB instance
  await mongoServer.stop();
});

// Clean up between tests
afterEach(async () => {
  // Clean all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRE = '1d';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests
