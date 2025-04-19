require('../startup/env');
const TokenPrice = require("../models/TokenPrice");
const Trade = require("../models/Trade");
const jupiterService = require("../services/jupiter.service");
const logger = require("./logger");

const BATCH_SIZE = 45; // You can tweak this depending on service limits

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

async function updateTokenPrice() {
    try {
        const tokens = await Trade.distinct('token', { tradeType: 'buy', status: { $nin: ['failed'] } });
        if (!tokens.length) {
            logger.info('No token found in trade for price');
            return;
        }

        logger.info(`Getting price update for ${tokens.length} tokens`);
        const tokenChunks = chunkArray(tokens, BATCH_SIZE);
        const bulkOps = [];

        for (const chunk of tokenChunks) {
            const prices = await jupiterService.getTokenPrice(chunk.join(','), true);
            
            for (const token of chunk) {
                const price = prices[token]?.price;
                if (price) {
                    logger.info(`Price logged for ${token}: ${price}`);
                    bulkOps.push({
                        updateOne: {
                            filter: { token },
                            update: {
                                $set: {
                                    price,
                                    date: new Date()
                                }
                            },
                            upsert: true
                        }
                    });
                }
            }
        }

        if (bulkOps.length) {
            const result = await TokenPrice.bulkWrite(bulkOps);
            logger.info(`Token price bulk upsert completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserts: ${result.upsertedCount}`);
        } else {
            logger.info(`No valid prices found for tokens`);
        }

    } catch (error) {
        logger.error(`Error while updating token price`);
        console.error(error);
    }
}

module.exports = { updateTokenPrice };
