const db = require('../startup/db');
const mongoose = require("mongoose");
const logger = require('../utils/logger');
const Trade = require('../models/Trade');
const jupiterService = require('../services/jupiter.service');
const TokenPrice = require('../models/TokenPrice');
const TokenVerification = require('../models/TokenVerification');

const updateRealizedProfit = async () => {
    try {
        await db();
        const trades = await Trade.find({ tradeType: "sell", status: "success" });

        for (const trade of trades) {
            let currentPrice;
            try {
                currentPrice = await jupiterService.getTokenPrice(trade.token);
            } catch (error) {
                const priceEntry = await TokenPrice.findOne({ token: trade.token })
                    .sort({ date: -1 })
                    .lean()
                    .select("price");
                currentPrice = priceEntry?.price ?? 0;
            }
            const tokenMeta = await TokenVerification.findOne({
                mint: trade.token
            });
            if (trade.tokenPriceAtPurchase && currentPrice) {
                const realizedPnL = (currentPrice - trade.tokenPriceAtPurchase) * (trade.inAmount / ((10 ** (tokenMeta.token.decimals))));

                await Trade.updateOne({ _id: trade._id }, { $set: { realizedProfit: realizedPnL } });
                logger.info(`✅ Updated realized profit for trade ${trade._id}: ${realizedPnL}`);
            }
        }

        logger.info("✅ Realized profit update completed");
        mongoose.disconnect();
    } catch (error) {
        logger.error("❌ Error updating realized profit", error);
        mongoose.disconnect();
    }
};

updateRealizedProfit();
