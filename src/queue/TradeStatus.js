const TradeService = require('../services/Trade.service');
const User = require('../models/User');
const { getUserPublicKey } = require('../utils/solanaHelper');
const { Worker } = require('bullmq');
const { redisConfig } = require('../../config/radis');
const { QUEUE_SUFFIX } = process.env;

const TradeStatus = new Worker('TradeStatusQueue' + QUEUE_SUFFIX, async (job) => {
    try {
        if (job.name === 'checkTradeStatus') {
            await TradeService.getTxnStatus('buy');
            TradeService.getTxnStatus('sell');
            return;
        }
    } catch (error) {
        console.error('TradeStatus processing failed:', error);
    }
}, {
    connection: redisConfig, limiter: {
        max: 2,  // Process 1 job at a time
        duration: 15 * 1000 // 10 seconds (10000ms) per job
    }
});


module.exports = TradeStatus;
