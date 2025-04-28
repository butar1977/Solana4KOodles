const { Worker } = require('bullmq');
const Token = require('../models/token');
const TokenRisk = require('../models/TokenVerification')
const { redisConfig } = require('../../config/radis');
const fetchNewTokens = require('./producer');
const { tokenQueue, riskQueue } = require('./index');
const { default: axios } = require('axios');
const { getPairDetails } = require('../utils/dexScreener');
const logger = require('../utils/logger');

const { QUEUE_SUFFIX } = process.env;


const getPayload = async (tokenData) => {
    const tokenVolumeData = await getPairDetails(tokenData.tokenAddress);
    return {
        url: tokenData.url,
        chainId: tokenData.chainId,
        tokenAddress: tokenData.tokenAddress,
        icon: tokenData.icon || '',
        header: tokenData.header || '',
        openGraph: tokenData.openGraph || '',
        description: tokenData.description || '',
        links: tokenData.links || [],
        source: tokenData.source || 'dexscreener',
        tokenDataVolumeSOL: tokenVolumeData?.tokenDataVolumeSOL,
        tokenDataVolumeUSDC: tokenVolumeData?.tokenDataVolumeUSDC,
        tokenVolume: tokenVolumeData?.tokenVolume,
        priceChange: tokenVolumeData?.priceChange,
        liquidity: tokenVolumeData?.liquidity,
        fdv: tokenVolumeData?.fdv,
        marketCap: tokenVolumeData?.marketCap,
        pairCreatedAt: tokenVolumeData?.pairCreatedAt
    };
}

const tokenWorker = new Worker('tokenQueue' + QUEUE_SUFFIX, async (job) => {
    logger.info(`🚀 Worker processing job: ${job.name}`);

    if (job.name === 'fetchTokens') {
        logger.info('📡 Fetching new tokens from API...');
        const tokens = await fetchNewTokens();
        for (const token of tokens) {
            if (token.chainId === 'solana') {
                await tokenQueue.add('saveToken', token);
            }
        }
        return;
    }

    if (job.name === 'saveToken') {
        try {
            const tokenData = job.data;
            logger.info(`💾 Saving token:', ${tokenData.tokenAddress}`);


            const existingToken = await Token.findOne({ tokenAddress: tokenData.tokenAddress });
            if (existingToken) {
                logger.info(`⚠️ Token ${tokenData.tokenAddress} already.`);
                return;
            }

            const payload = await getPayload(tokenData);
            const tokenCreated = await Token.create(payload);
            logger.info(`✅ Token ${tokenData.tokenAddress} saved.`);
            
            await riskQueue.add('checkRisk', {
                tokenId: tokenCreated._id,
                tokenAddress: tokenData.tokenAddress
            })
            logger.info(`🔍 Enqueued risk check for ${tokenData.tokenAddress}`);
        } catch (error) {
            console.error('❌ Error processing token queue:', error);
        }
    }
}, {
    connection: redisConfig
});

logger.info('✅ Token worker started...');
module.exports = tokenWorker;
