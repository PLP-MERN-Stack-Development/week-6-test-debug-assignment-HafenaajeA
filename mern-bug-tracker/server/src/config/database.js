// Database configuration
const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/bugtrackertest'
      : process.env.MONGO_URI || 'mongodb://localhost:27017/bugtracker';

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    if (process.env.NODE_ENV !== 'test') {
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
    }

    return conn;
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (process.env.NODE_ENV !== 'test') {
      logger.info('MongoDB Disconnected');
    }
  } catch (error) {
    logger.error('Database disconnection error:', error);
  }
};

const clearDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    logger.error('Database clear error:', error);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  clearDB,
};
