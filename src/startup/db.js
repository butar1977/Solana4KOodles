require('../startup/env');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const { DB_URL } = process.env;

console.log('DB_URL',DB_URL)

module.exports = async function db() {
  mongoose.set('strictQuery', false);
  try {
    await mongoose.connect(DB_URL).then();
    logger.info('Connected to MongoDB...');
  } catch (error) {
    console.error('Error while connecting to database');
    console.error(error);
    process.exit(1);
  }
};
