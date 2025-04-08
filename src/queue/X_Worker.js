const { Worker } = require("bullmq");
const axios = require("axios");
const { redisConfig } = require("../../config/radis");
const Tweet = require('../models/Tweets');
const { extractSolanaAddress } = require("../utils/extractSolanaAddress");
const { tokenQueue } = require(".");
const logger = require("../utils/logger");

const { X_BEARER_TOKEN, TWITTER_PARAMS, TWITTER_QUERY } = process.env;
const { QUEUE_SUFFIX } = process.env;

const getTweets = async (url) => {
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
        });
        // logger.info('response.data.data', response.data.data)

        if (!response?.data?.data) {
            logger.info(`❌ No Tweet found: ${url}`);
            return;
        }


        logger.info(url);
        // logger.info('response.data.data',response.data.data)
        const users = response?.data?.includes?.users;

        response.data.data.forEach(async tweet => {
            tweet.haveTokenAddress = false;
            const tokenAddress = extractSolanaAddress(tweet.text);
            if (tokenAddress) {
                tweet.haveTokenAddress = true;
                logger.info(`🚀 Found Token Address: ${tokenAddress} in Tweet ID: ${tweet.id}`);
            } else {
                logger.info(`❌ No Token Address found in Tweet ID: ${tweet.id}`);
            }
            tweet.tweetId = tweet.id;
            delete tweet.id;

            const user = users.filter((key) => { return key.id == tweet.author_id })[0];
            const payload = {
                ...tweet,
                username: user?.username || '',
                name: user?.name || '',
                verified: user?.verified || false,
                xUserId: user?.id || '',
            };

            const tweetCreated = await Tweet.updateOne(
                { tweetId: tweet.tweetId },
                { ...payload },
                { upsert: true }
            );
            if (tweet.haveTokenAddress) {
                await tokenQueue.add('saveToken', {
                    url: tweet?.text || '',
                    chainId: 'solana',
                    tokenAddress: tokenAddress,
                    source: 'X',
                    x_id: tweetCreated._id
                });
            }
        });
    } catch (error) {
        console.error(`Error fetching tweets for:`, error.response?.data || error.message);
    }
}

const fetchTweets = async (batch) => {
    let subBatchSize = 10;

    for (let j = 0; j < batch.length; j += subBatchSize) {
        const subBatch = batch.slice(j, j + subBatchSize);
        const query = subBatch.map(user => `from:${user}`).join(" OR ");
        const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&${TWITTER_PARAMS}`;
        logger.info(`Fetched tweets for: ${subBatch.join(", ")}`);
        await getTweets(url);
        await new Promise(resolve => setTimeout(resolve, 30 * 1000));
    }
};

const X_Worker = new Worker("X_Queue_0011" + QUEUE_SUFFIX, async (job) => {
    logger.info(`Processing job: ${job.name}`);
    logger.info(job.name, 'job.datajob.data');

    const flag = job.name;
    if (flag === 'fetchTweets') {
        await fetchTweets(job.data.batch);
    } else if (flag === 'recentTweet') {
        const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(TWITTER_QUERY)}&${TWITTER_PARAMS}`;
        await getTweets(url);
    }
}, {
    connection: redisConfig,
    limiter: {
        max: 5, // Max 14 requests per interval
        duration: 15 * 60 * 1000, // 1 minute (60,000ms)
    }
});
logger.info("✅ X_Worker is now listening for jobs...");
module.exports = X_Worker;
