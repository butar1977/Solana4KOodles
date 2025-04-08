const { Worker } = require('bullmq');
const axios = require('axios');
const TokenRisk = require('../models/TokenVerification');
const { redisConfig } = require('../../config/radis');
const token = require('../models/token');
const { sendScamTokenAdminNotification, sendNewTokenAdminNotification } = require('../services/notification.service');
const { getRiskLevel } = require('../services/token.service');
const logger = require('../utils/logger');
const { getPairDetails } = require('../utils/dexScreener');
const { QUEUE_SUFFIX } = process.env;


const getRisk = async (token, retries = 5) => {
    const { RUGCHECK_API_URL } = process.env;
    const api = `${RUGCHECK_API_URL}/v1/tokens/${token}/report`;

    try {
        return await axios.get(api);
    } catch (error) {
        if (error.response?.status === 429 && retries > 0) {
            logger.info(`⏳ Rate limit hit for ${token}. Retrying in 5s... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return getRisk(token, retries - 1);
        }
        throw error;
    }
};

const riskWorker = new Worker('riskQueue' + QUEUE_SUFFIX, async (job) => {
    try {
        logger.info(`🔍 Checking risk for ${job.data.tokenAddress}`);

        const tokenRisk = await getRisk(job.data.tokenAddress);

        if (!tokenRisk.error) {
            const tokenData = await token.findOne({ _id: job.data.tokenId })
            if (!tokenData) {
                logger.warn(`⚠️ Token ${job.data.tokenAddress} not found in database.`);
                return;
            }

            const pct = tokenRisk.data.topHolders.slice(0, 10).reduce((sum, h) => sum + (h.pct || 0), 0);
            logger.info(`Token ${job.data.tokenAddress} have pct: ${pct}`)
            logger.info('token.topHolderstoken.topHolders', tokenRisk.data.topHolders)

            await TokenRisk.create({
                ...tokenRisk.data,
                token_id: job.data.tokenId,
                tokenVolume: tokenData.tokenVolume,
                percentageHolderTop10: pct

            });
            const { score_normalised, mint } = tokenRisk.data;
            const { label } = await getRiskLevel(score_normalised);



            const filters = {
                minLaunchAge: Number(process.env.MIN_VOLUME) || 0, // 0 hours
                maxLaunchAge: (Number(process.env.MAX_LAUNCH_AGE) || 24) * 60 * 60 * 1000, // 12 hours in ms
                minMarketCap: Number(process.env.MIN_MARKET_CAP) || 50000,
                minVolume: Number(process.env.MIN_VOLUME) || 20000,
                minLiquidity: Number(process.env.MIN_LIQUIDITY) || 10000,
                minPriceChange: Number(process.env.MIN_PRICE_CHANGE) || 10,
            };
            const currentTime = Date.now();

            const isValidToken = await TokenRisk.findOne({
                mint,
                detectedAt: {
                    $gte: new Date(currentTime - filters.maxLaunchAge),
                    $lte: new Date(currentTime - filters.minLaunchAge)
                },
                percentageHolderTop10: { $gte: 40 }
            }).lean();


            if (isValidToken) {

                const totalPct = isValidToken.percentageHolderTop10;
                logger.info(`Token ${mint} have pct: ${totalPct}`)

                const marketData = await getPairDetails(mint);
                await token.updateOne({ tokenAddress: mint }, marketData);

                const query = {
                    tokenAddress: mint,
                    marketCap: { $gte: filters.minMarketCap },
                    "tokenDataVolumeSOL.h24": { $gte: filters.minVolume },
                    "liquidity.usd": { $gte: filters.minLiquidity },
                    $or: [{ "priceChange.h1": { $gte: filters.minPriceChange } }],
                };

                console.log('query',query)
                const tokens = await token.find(query).lean();

                if (tokens.length) {
                    if (label === 'Super Risk') {
                        await sendScamTokenAdminNotification(tokenRisk.data, label)
                        return;
                    }
                    await sendNewTokenAdminNotification(tokenRisk.data, label)
                } else {
                    logger.info(`Token ${mint} does not meet filter criteria.`);
                }

            }

            logger.info(`✅ Risk saved for ${job.data.tokenAddress}`);
        }

    } catch (error) {
        console.error(`❌ Risk check failed for ${job.data.tokenAddress}:`, error);
    }
},
    {
        connection: redisConfig, limiter: {
            max: 2,
            duration: 15 * 1000
        }
    });

logger.info('✅ Risk worker started...');
module.exports = riskWorker;
