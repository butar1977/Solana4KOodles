require('../startup/env');
const TokenPrice = require("../models/TokenPrice");
const Trade = require("../models/Trade");
const jupiterService = require("../services/jupiter.service");
const logger = require("./logger");

async function updateTokenPrice() {
    try {
        const tokens = await Trade.distinct('token', { status: { $ne: 'failed' } });
        if (!tokens.length){
            logger.info('No token found in trade for price')
            return;
        } 

        logger.info(`Getting price update for ${tokens.length}`)
        for (const token of tokens) {
            const price = await jupiterService.getTokenPrice(token);
            if (price) {
                await TokenPrice.create({ token, price, date: new Date() });
                logger.info(`Price logged for ${token}: ${price}`);
            }
        }
    } catch (error) {
        logger.error(`Error while updating token price`)
        console.log(error)
    }
}

module.exports = { updateTokenPrice }