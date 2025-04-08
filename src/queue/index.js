const { Queue } = require('bullmq');
const { redisConfig } = require('../../config/radis');
const X_Accounts = require('../models/X_Accounts');
const logger = require('../utils/logger');
const { QUEUE_SUFFIX } = process.env;
const tokenQueue = new Queue('tokenQueue' + QUEUE_SUFFIX, { connection: redisConfig });
const riskQueue = new Queue('riskQueue' + QUEUE_SUFFIX, { connection: redisConfig });
const X_Queue = new Queue('X_Queue_0011' + QUEUE_SUFFIX, { connection: redisConfig });
const NotificationQueue = new Queue('NotificationQueue' + QUEUE_SUFFIX, { connection: redisConfig });
const TradeQueue = new Queue('TradeQueue' + QUEUE_SUFFIX, { connection: redisConfig });
const TradeStatusQueue = new Queue('TradeStatusQueue' + QUEUE_SUFFIX, { connection: redisConfig })
const priceUpdateQueue = new Queue('priceUpdateQueue' + QUEUE_SUFFIX, { connection: redisConfig })


const clearRepeatableJob = async (queue, jobId) => {
    const existingJobs = await queue.getRepeatableJobs();
    for (const job of existingJobs) {
        if (job.id === jobId) {
            logger.info(`🛑 Removing old job: ${jobId}`);
            await queue.removeRepeatableByKey(job.key);
        }
    }
};

const scheduleJob = async (queue, jobId, name, data, interval) => {

    await clearRepeatableJob(queue, jobId); // ✅ Remove old job


    const existingJobs = await queue.getRepeatableJobs();
    const jobExists = existingJobs.some(job => job.id === jobId);

    if (!jobExists) {
        await queue.add(name, data, {
            repeat: { every: interval },
            jobId
        });
        logger.info(`✅ Scheduled ${name} job (${interval / 60000} min)`);
    } else {
        logger.info(`⚠️ Job ${name} already scheduled, skipping duplicate.`);
    }
};

const scheduleTokenJob = async () => {
    await scheduleJob(tokenQueue, 'fetchTokensJob', 'fetchTokens', { message: 'Fetching new tokens' }, 15 * 60 * 1000);
};

const scheduleXJob = async () => {
    try {
        const usernames = await X_Accounts.find({}, 'username').lean();
        const usernameList = usernames.map(user => user.username);

        if (!usernames.length) {
            logger.info("⚠️ No usernames found, skipping Twitter job.");
            return;
        }

        await scheduleJob(X_Queue, 'fetchTweetsJob', 'fetchTweets', { batch: usernameList, flag: 'username' }, 30 * 60 * 1000);
    } catch (error) {
        console.error("❌ Failed to schedule Twitter job:", error);
    }
};

const scheduleXRecentTweets = async () => {
    await scheduleJob(X_Queue, 'fetchTweetsRecentJob', 'recentTweet', { batch: [] }, 15 * 60 * 1000);
};

const scheduleTradeJob = async () => {
    await scheduleJob(TradeQueue, 'buyTradeJob', 'executeBuyTrades', {}, 30 * 1000);
};
const scheduleTradeStatusJob = async () => {
    await scheduleJob(TradeStatusQueue, 'TradeStatusQueue', 'checkTradeStatus', {}, 2 * 60 * 1000);
};
const schedulePriceUpdateJob = async () => {
    await scheduleJob(priceUpdateQueue, 'fetchTokenPricesJob', 'fetchTokenPrices', {},  60 * 1000);
};

(async () => {
    await scheduleTokenJob();
    await scheduleXJob();
    await scheduleXRecentTweets();
    await scheduleTradeJob();
    await scheduleTradeStatusJob();
    await schedulePriceUpdateJob();
})();

module.exports = {
    tokenQueue,
    riskQueue,
    X_Queue,
    NotificationQueue,
    TradeQueue,
    TradeStatusQueue,
    priceUpdateQueue
};
