require('../startup/env');
const TokenPrice = require("../models/TokenPrice");
const Trade = require("../models/Trade");
const jupiterService = require("../services/jupiter.service");
const logger = require("./logger");

async function updateTokenPrice() {
    try {
        const tokens = await Trade.distinct('token', { tradeType: 'buy', status: { $nin: ['failed'] } });
        if (!tokens.length) {
            logger.info('No token found in trade for price');
            return;
        }

        logger.info(`Getting price update for ${tokens.length}`);
        const prices = await jupiterService.getTokenPrice(tokens.join(','), true);

        const bulkOps = [];

        for (const token of tokens) {
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


module.exports = { updateTokenPrice }