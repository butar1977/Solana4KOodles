const TokenVerification = require("../models/TokenVerification");
const Trade = require("../models/Trade");
const User = require("../models/User");
const { bot } = require("./telegram.service");
const admins = new Set(process.env.ADMIN_USER_IDS.split(','));

const logger = require("../utils/logger");

async function sendNotification(telegramId, message) {
    try {
        await bot.telegram.sendMessage(telegramId, message, { parse_mode: "Markdown" });
        logger.info(`📩 Notification sent to ${telegramId}`);
    } catch (error) {
        logger.error(`❌ Failed to send notification to ${telegramId}:`, error);
    }
}



async function sendNotificationAdmin(data) {
    try {
        const { selectedRisk: riskLevel, min, max, ctx } = data;
        const { id } = ctx.chat;

        const message = `🚨 *Risk Level Update:*\n\n` +
            `👉 *${riskLevel} Risk* is now updated to *(${min}-${max})*\n\n` +
            `Stay alert and take necessary actions.`;
        admins.forEach(async adminId => {
            await bot.api.sendMessage(adminId, message, { parse_mode: "Markdown" });
        })
        logger.info(`📩 Notification sent to ${id}`);
    } catch (error) {
        logger.error(`❌ Failed to send notification `, error);
    }
}


async function sendTradeNotification(userId, trade, status, message = "") {

    const user = await User.findOne({ _id: userId })

    let amt = '';
    const tokenMeta = await TokenVerification.findOne({
        mint: trade.token
    });

    if (trade.tradeType === 'buy') {
        amt = `${trade.amount / (10 ** 9)} SOL\n🔹 Purchased tokens: ${trade.outAmount / (10 ** tokenMeta.token.decimals ?? 1)} ${tokenMeta.tokenMeta.symbol ?? ''}`;
    } else if (trade.tradeType === 'sell') {

        amt = trade.amount / (10 ** (tokenMeta.token.decimals ?? 1));
        amt = `${amt} ${tokenMeta.tokenMeta.symbol ?? ''}`
    }
    // const amt = trade.tradeType == 'buy' ? (): trade.amount;
    let tradeMessage = `📊 **Trade Update**\n\n🔹 **Type**: ${trade.tradeType.toUpperCase()}\n🔹 **Name**: ${tokenMeta.tokenMeta.name}\n🔹 **Token**: ${trade.token}\n🔹 **Amount**: ${amt}\n🔹 **Risk Level**: ${trade.riskLevel}\n🔹 **Status**: `;

    if (status === "success") {
        tradeMessage += `✅ *SUCCESS*\n\n🔗 [View Transaction](https://solscan.io/tx/${trade.signature})`;
    } else {
        tradeMessage += `❌ *FAILED*\n🔸 Reason: ${message}`;
    }
    if (trade.tradeType === 'sell') {
        tradeMessage += ` Reason: ${trade.msg}`;
    }
    logger.info(`📩 Notification sendTradeNotification to ${userId}`);

    await bot.api.sendMessage(user.telegramId, tradeMessage, { parse_mode: "Markdown" });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function sendNewTokenAdminNotification(token, riskLevel) {
    try {
        const message = `🚀 *New Token Detected!*\n\n` +
            `🔹 *Token Address:* \`${token.mint}\`\n` +
            `🔹 *Token Name:* \`${token?.tokenMeta?.name}\`\n` +
            `🔹 *Symbol:* \`${token?.tokenMeta.symbol}\`\n` +
            `🔹 *Risk Level:* \`${riskLevel}\`\n\n` +
            `✅ This token has been detected and added to the system.\n`;

        admins.forEach(async adminId => {
            await bot.api.sendMessage(adminId, message, { parse_mode: "Markdown" });
        })
        logger.info(`📩 New Token Notification sent to Admin`);
    } catch (error) {
        logger.error(`❌ Failed to send new token notification`, error);
    }
}

async function sendScamTokenAdminNotification(token, riskLevel) {
    try {
        const message = `🚨 *Scam Token Alert!*\n\n` +
            `⚠️ A suspicious token has been detected:\n\n` +
            `🔹 *Token Address:* \`${token.mint}\`\n` +
            `🔹 *Token Name:* \`${token?.tokenMeta?.name}\`\n` +
            `🔹 *Symbol:* \`${token?.tokenMeta?.symbol}\`\n` +
            `🔹 *Risk Level:* \`${riskLevel}\`\n\n` +
            `❌ This token is flagged as a potential scam and can not take part in trade.\n`;

        admins.forEach(async adminId => {
            await bot.api.sendMessage(adminId, message, { parse_mode: "Markdown" });
        })

        logger.info(`📩 Scam Token Notification sent to Admin`);
    } catch (error) {
        logger.error(`❌ Failed to send scam token notification`, error);
    }
}

async function disabledTradingUserAc(userId) {
    const user = await User.findOne({ _id: userId })
    const { last4TxnFailed, tradeEnabled } = user;
    console.log('last4TxnFailed, tradeEnabled', last4TxnFailed, tradeEnabled)
    if (last4TxnFailed && !tradeEnabled) {
        logger.info(`📩 Already set disabledTradingUserAc to ${userId}`);
        return;
    }

    user.last4TxnFailed = true;
    user.tradeEnabled = false;
    await user.save();
    const message = "⚠️ Your last 4 trades have failed! Trading has been disabled for your account.";

    logger.info(`📩 Notification disabledTradingUserAc to ${userId}`);

    await bot.api.sendMessage(user.telegramId, message, { parse_mode: "Markdown" });
}



module.exports = {
    sendNotification,
    sendNotificationAdmin,
    sendTradeNotification,
    delay,
    sendNewTokenAdminNotification,
    sendScamTokenAdminNotification,
    disabledTradingUserAc
};
