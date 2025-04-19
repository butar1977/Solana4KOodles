require('../startup/env');
const TokenPrice = require("../models/TokenPrice");
const Trade = require("../models/Trade");
const jupiterService = require("../services/jupiter.service");
const logger = require("./logger");

const BATCH_SIZE = 20; // Adjust the batch size according to the API limits and database performance

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

        // Processing all chunks in parallel
        const bulkWritePromises = tokenChunks.map(async (chunk) => {
            const prices = await jupiterService.getTokenPrice(chunk.join(','), true);
            const chunkBulkOps = [];

            for (const token of chunk) {
                const price = prices[token]?.price;
                if (price) {
                    logger.info(`Price logged for ${token}: ${price}`);
                    chunkBulkOps.push({
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

            // If there are any bulk operations to write
            if (chunkBulkOps.length) {
                await TokenPrice.bulkWrite(chunkBulkOps);
                logger.info(`Batch bulk write completed for ${chunk.length} tokens`);
            }
        });

        // Wait for all bulk write operations to complete
        await Promise.all(bulkWritePromises);

        logger.info('All token price updates completed successfully');

    } catch (error) {
        logger.error('Error while updating token price');
        console.error(error);
    }
}

module.exports = { updateTokenPrice };
