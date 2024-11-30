const mongoose = require('mongoose');

// Retry function with retry mechanism
const retryOperation = async (operation, retries = 5, delay = 500) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await operation();
    } catch (error) {
      if (error.name === 'MongoNetworkError' || error.code === 'ETIMEDOUT') {
        attempt++;
        console.log(`Network error: Retrying operation (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay)); // Delay before retry
      } else {
        throw error; // Non-network errors should not be retried
      }
    }
  }
  throw new Error(`Operation failed after ${retries} retries`);
};

// Create a global Mongoose plugin
const mongooseRetryPlugin = (schema) => {
  // Hook for `save`
  schema.pre('save', function (next) {
    const doc = this;
    retryOperation(() => doc.save(), 5)
      .then(() => next())
      .catch((err) => next(err));
  });

  // Hook for `find`
  schema.pre('find', function (next) {
    const query = this;
    retryOperation(() => query.exec(), 5)
      .then(() => next())
      .catch((err) => next(err));
  });

  // Hook for `findOne`
  schema.pre('findOne', function (next) {
    const query = this;
    retryOperation(() => query.exec(), 5)
      .then(() => next())
      .catch((err) => next(err));
  });

  // Hook for `updateOne`
  schema.pre('updateOne', function (next) {
    const query = this;
    retryOperation(() => query.exec(), 5)
      .then(() => next())
      .catch((err) => next(err));
  });

  // Hook for `remove`
  schema.pre('remove', function (next) {
    const doc = this;
    retryOperation(() => doc.remove(), 5)
      .then(() => next())
      .catch((err) => next(err));
  });
};

module.exports = mongooseRetryPlugin;
