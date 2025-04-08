const { Worker } = require('bullmq');
const { redisConfig } = require('../../config/radis');
const Trade = require('../models/Trade');
const TokenPrice = require('../models/TokenPrice');
const axios = require('axios');
const logger = require('../utils/logger');
const jupiterService = require('../services/jupiter.service');
const { updateTokenPrice } = require('../utils/updateTokenPrice');

const { QUEUE_SUFFIX } = process.env;


const processJob = async (job) => {
    try {
        // Ignore failed trades
        await updateTokenPrice();
        logger.info('✅ Token prices updated successfully');
    } catch (error) {
        logger.error('❌ Failed to update token prices:', error);
    }
};

const priceUpdateWorker = new Worker('priceUpdateQueue' + QUEUE_SUFFIX, async (job) => {
    await processJob(job);
}, {
    connection: redisConfig,
    concurrency: 5
});

logger.info('🚀 Price update worker started');

module.exports = priceUpdateWorker;
