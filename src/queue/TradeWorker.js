const TradeService = require('../services/Trade.service');
const User = require('../models/User');
const { getUserPublicKey } = require('../utils/solanaHelper');
const { Worker } = require('bullmq');
const { redisConfig } = require('../../config/radis');
const logger = require('../utils/logger');
const Wallet = require('../models/Wallet');
const { QUEUE_SUFFIX } = process.env;


const getUserActiveWallet = async (user_id) => {
    try {
        const wallet = await Wallet.findOne({ status: true, user_id })
        if (!wallet) {
            logger.info(`User does not have any active wallet ${user_id}`)
            return null;
        }
        return wallet.privateKey;

    } catch (error) {
        logger.info(`Unable to get active wallet ${error}`)
    }
}

const TradeWorker = new Worker('TradeQueue' + QUEUE_SUFFIX, async (job) => {
    if (job.name === 'executeBuyTrades') {
        TradeService.processTokenSellsForUsers();
        return;
    }

    try {
        const { userId, token, riskLevel, decimals, realizedPnL, tokenPriceAtSell, msg } = job.data;
        let amount = 0;

        const user = await User.findOne({ _id: userId });
        const {
            buyAmount,
            slippage,
            stopLoss,
            takeProfit,
        } = user;

        const privateKey = await getUserActiveWallet(userId);
        if (privateKey === null) {
            return;
        }
        
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
