const TradeService = require('../services/Trade.service');
const User = require('../models/User');
const { getUserPublicKey } = require('../utils/solanaHelper');
const { Worker } = require('bullmq');
const { redisConfig } = require('../../config/radis');
const logger = require('../utils/logger');
const { QUEUE_SUFFIX } = process.env;

const TradeWorker = new Worker('TradeQueue' + QUEUE_SUFFIX, async (job) => {
    if (job.name === 'executeBuyTrades') {
        TradeService.processTokenSellsForUsers();
        // TradeService.processTokenTradesForUsers();
        return;
    }

    try {
        const { userId, token, riskLevel, decimals, realizedPnL,tokenPriceAtSell,msg } = job.data;
        let amount = 0;

        const user = await User.findOne({ _id: userId });
        const {
            buyAmount,
            slippage,
            stopLoss,
            takeProfit,
            privateKey
        } = user;

        const publicKey = await getUserPublicKey(privateKey);
        logger.info(`Processing trade: ${job.name} ${buyAmount} ${decimals}`);


        if (job.name === 'sell') {
            amount = job.data.amount;
        } else if (job.name === 'buy') {
            amount = (buyAmount * (10 ** decimals))
        }
        if (amount <= 0) {
            logger.info(`Have zero balance trade: ${job.name} ${buyAmount} ${decimals}`);
            return;
        }
        const payload = {
            userId,
            userPublicKey: publicKey,
            userPrivateKey: privateKey,
            token,
            amount,
            tradeType: job.name,
            riskLevel,
            slippage,
            stopLoss,
            takeProfit,
            realizedPnL,
            decimals,
            tokenPriceAtSell,
            msg
        }
        await TradeService.executeTrade(payload);
    } catch (error) {
        console.error('TradeWorker processing failed:', error);
    }
}, {
    connection: redisConfig, limiter: {
        max: 2, 
        duration: 15 * 1000
    }
});

module.exports = TradeWorker;
