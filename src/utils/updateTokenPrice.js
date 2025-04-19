require('../startup/env');
const TokenPrice = require("../models/TokenPrice");
const Trade = require("../models/Trade");
const jupiterService = require("../services/jupiter.service");
const logger = require("./logger");

const { BATCH_SIZE } = process.env;

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

async function updateTokenPrice() {
    try {
        const tokens = await Trade.distinct('token', { tradeType: 'buy', status: { $nin: ['failed','pending'] } });
        if (!tokens.length) {
            logger.info('No tokens found in trades for price update');
            return;
        }

        logger.info(`Getting price update for ${tokens.length} tokens`);

        const JUPITER_CHUNK_SIZE = 50;
        const tokenChunks = chunkArray(tokens, JUPITER_CHUNK_SIZE);
        const tokenPriceDocs = [];

        // Fetch prices in fixed Jupiter API chunks
        for (const chunk of tokenChunks) {
            const prices = await jupiterService.getTokenPrice(chunk.join(','), true);

            for (const token of chunk) {
                const price = prices[token]?.price;
                if (price) {
                    logger.info(`Price for ${token}: ${price}`);
                    tokenPriceDocs.push({ token, price, date: new Date() });
                }
            }
        }

        // Insert into Mongo in BATCH_SIZE chunks
        const insertChunks = chunkArray(tokenPriceDocs, Number(BATCH_SIZE));
        for (const insertChunk of insertChunks) {
            await TokenPrice.insertMany(insertChunk);
        }

        logger.info('All token price updates completed successfully');
    } catch (error) {
        logger.error('Error while updating token prices');
        console.error(error);
    }
}

module.exports = { updateTokenPrice };
