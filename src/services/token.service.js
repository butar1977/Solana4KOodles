require('../startup/env');
const RiskLevel = require('../models/RiskLevel');
const Token = require('../models/token');  // Use Token model instead of TokenVerification
const TokenVerification = require('../models/TokenVerification');
const { getPairDetails } = require('../utils/dexScreener');
const logger = require('../utils/logger');

async function getFilteredTokens() {
    const filters = {
        minLaunchAge: Number(process.env.MIN_VOLUME) || 0, // 0 hours
        maxLaunchAge: (Number(process.env.MAX_LAUNCH_AGE) || 24) * 60 * 60 * 1000, // 12 hours in ms
        minMarketCap: Number(process.env.MIN_MARKET_CAP) || 50000,
        minVolume: Number(process.env.MIN_VOLUME) || 20000,
        minLiquidity: Number(process.env.MIN_LIQUIDITY) || 10000,
        minPriceChange: Number(process.env.MIN_PRICE_CHANGE) || 10,
    };

    logger.info(`Filters: ${JSON.stringify(filters)}`);

    const risk = await RiskLevel.findOne({ label: 'High Risk' });
    const maxRisk = risk?.max ?? 56;
    const currentTime = Date.now();

    const validTokensAllHolders = await TokenVerification.find({
        score_normalised: { $lte: maxRisk },
        detectedAt: {
            $gte: new Date(currentTime - filters.maxLaunchAge),
            $lte: new Date(currentTime - filters.minLaunchAge)
        },
        percentageHolderTop10: { $gte: 40 } 
    }).lean();
    if (!validTokensAllHolders.length) {
        logger.info(`No valid tokens found to trade`);
        return [];
    }

    const tokenAddresses = validTokensAllHolders.map(t => t.mint);
    logger.info(`validTokens validTokens ${tokenAddresses}`)

    // Fetch & update market data in bulk
    const marketData = await Promise.all(tokenAddresses.map(getPairDetails));

    await Promise.all(marketData.map(async (data, index) => {
        await Token.findOneAndUpdate(
            { tokenAddress: tokenAddresses[index] },
            { ...data },
            { new: true }
        );
        logger.info(`Market data updated for ${tokenAddresses[index]}}`)
    }));

    const query = {
        tokenAddress: { $in: tokenAddresses },
        marketCap: { $gte: filters.minMarketCap },
        "tokenDataVolumeSOL.h24": { $gte: filters.minVolume },
        "liquidity.usd": { $gte: filters.minLiquidity },
        $or: [
            { "priceChange.h1": { $gte: filters.minPriceChange } },
        ],
    };

    const tokens = await Token.find(query);
    return tokens;
}


async function getRiskLevel(score) {
    const risk = await RiskLevel.findOne({
        min: { $lte: score },
        max: { $gte: score }
    });

    return risk ? { label: risk.label, description: risk.description } : { label: "Unknown", description: "No data available" };
}

module.exports = { getFilteredTokens, getRiskLevel };
