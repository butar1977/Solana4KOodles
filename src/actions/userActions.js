const { bot } = require("../services/telegram.service");
const RiskLevel = require("../models/RiskLevel");
const User = require("../models/User");
const { Markup } = require("telegraf");
const { backMenu, backKeyboard, replyOrEdit, backKeyboardUser } = require("../utils/telegramBot");
const { NotificationQueue } = require("../queue");
const { sendNotificationAdmin } = require("../services/notification.service");
const adminMessage = require('../utils/handlersMessage');
const { isAdmin } = require("../middleware/admin.middleware");
const { addUser, removeUser, viewUser, verifyPassword, setupWallet, checkWalletSetup, getBuyAmount, getSlippage, getUserDetails, updateNotificationPreference, getStopLoss, getTakeProfit, tokenForceSell, updateTradeToggle } = require("../handlers/user.handler");
const manageUserKeyboard = require("../keyboards/manageUserKeybaord");
const { getSellProfitLoss, setAutoSell } = require("../handlers/setting.handler");
const { getUserKeyboard, pnlKeyboard } = require("../keyboards/userKeyboard");
const { viewTrades } = require("../handlers/trade.handler");
const logger = require("../utils/logger");
const TradeService = require("../services/Trade.service");
const { validateDate } = require("../utils/validateDate");

// 🟢 Setup Handlers
async function setupHandlersUser(ctx) {
    const action = ctx.callbackQuery.data;
    logger.info(`${action}, 'actionactionaction'`);

    switch (action) {
        case 'user_back':
            await backMenu(ctx, '🔹 User Menu');
            break;
        case 'setup_wallet':
            await handleSetpWallet(ctx);
            break;

        case 'set_buy_params':
            await handleSetByParams(ctx);
            break;
        case 'set_stop_loss':
            await handleStopLoss(ctx);
            break;
        case 'force_sell':
            await handleForceSell(ctx);
            break;

        case 'toggle_notifications':
            await handleToggleNotification(ctx);
            break;

        case 'view_trades':
            await viewTrades(ctx, 1);
            break;
        case 'toggle_trade_status':
            await handleTradeToggle(ctx);

            break;
        case 'view_pnl':
            await handlePnl(ctx);
            break;

        case 'pnl_7days':
            await viewPnl(ctx, action);
            break;
        case 'pnl_today':
            await viewPnl(ctx, action);
            break;
        case 'pnl_custom':
            await viewPnl(ctx, action);
            break;
        default:
            if (action?.startsWith("view_trades:")) {
                const page = parseInt(action.split(":")[1]);
                await viewTrades(ctx, page);
            }
    }

}
async function handleSetpWallet(ctx) {
    const isWalletSetup = await checkWalletSetup(ctx);
    if (isWalletSetup) {
        return ctx.reply("✅ Your wallet is already set up and linked.", {
            reply_markup: await getUserKeyboard(ctx)
        });
    }
    const replyMarkup = {
        text: adminMessage.setupWallet,
        options: { reply_markup: backKeyboardUser }
    };
    await replyOrEdit(ctx, replyMarkup);
    ctx.session.waitingWalletSetup = true;
}

async function handleSetByParams(ctx) {
    const userDetails = await getUserDetails(ctx, ["buyAmount", "slippage"]);
    const text = `Currnet Values: \n 💰 Buy Amount: ${userDetails.buyAmount ?? 'NA'}\n🔹 Slippage: ${userDetails.slippage ?? 'NA'}% \n\n ${adminMessage.buyAmtMsg}`;
    const replyMarkup = {
        text,
        options: { reply_markup: backKeyboardUser }
    };
    await replyOrEdit(ctx, replyMarkup);
    ctx.session.waitingForBuyAmount = true;
}
async function handleStopLoss(ctx) {
    const userDetails = await getUserDetails(ctx, ["stopLoss", "takeProfit"]);
    const text = `Currnet Values: \n 💰 Stop Loss: ${userDetails.stopLoss ?? 'NA'}\n🔹 Take Profit: ${userDetails.takeProfit ?? 'NA'}% \n\n ${adminMessage.enterStopLoss}`;
    const replyMarkup = {
        text,
        options: { reply_markup: backKeyboardUser }
    };
    await replyOrEdit(ctx, replyMarkup);
    ctx.session.waitingForStopLoss = true;
}
async function handleToggleNotification(ctx) {
    const isUpdated = await updateNotificationPreference(ctx);
    if (isUpdated) {
        const replyMarkup = {
            text: adminMessage.notificationUpdated,
            options: { reply_markup: await getUserKeyboard(ctx) }
        };
        await replyOrEdit(ctx, replyMarkup);
    }

}
async function handleTradeToggle(ctx) {
    const isUpdated = await updateTradeToggle(ctx);
    if (isUpdated) {
        const replyMarkup = {
            text: adminMessage.tradeUpdated,
            options: { reply_markup: await getUserKeyboard(ctx) }
        };
        await replyOrEdit(ctx, replyMarkup);
    }

}

async function handlePnl(ctx) {
    const replyMarkup = {
        text: adminMessage.pnlDateRange,
        options: { reply_markup: await pnlKeyboard() }
    };
    await replyOrEdit(ctx, replyMarkup);
}

async function viewPnl(ctx, action) {
    if (action === 'pnl_custom') {
        const replyMarkup = {
            text: 'Enter the start date (YYYY-MM-DD):',
            options: { reply_markup: backKeyboard }
        };
        await replyOrEdit(ctx, replyMarkup);
        ctx.session.waitingForStartDatePnL = true;
    } else {
        await TradeService.sendEODPnLReport(ctx, action);
    }
}

// 

async function handleForceSell(ctx) {
    const replyMarkup = {
        text: 'Enter token address to force sell',
        options: { reply_markup: backKeyboard }
    };
    await replyOrEdit(ctx, replyMarkup);
    ctx.session.waitingForForceSell = true;
}

async function getPnLEndDate(ctx) {
    ctx.session.startDate = ctx.message.text;
    const isDateVaild = validateDate(ctx.session.startDate);
    if (isDateVaild) {
        const replyMarkup = {
            text: isDateVaild,
            options: { reply_markup: backKeyboard }
        };
        await replyOrEdit(ctx, replyMarkup);
        return;
    }
    ctx.session.waitingForStartDatePnL = false;
    ctx.session.waitingForEndDate = true;
    const replyMarkup = {
        text: 'Enter the end date (YYYY-MM-DD)',
        options: { reply_markup: backKeyboard }
    };
    await replyOrEdit(ctx, replyMarkup);

}

async function handleTextMessageUser(ctx, action) {
    if (ctx.session.waitingForPassword) {
        await verifyPassword(ctx);
    } else if (ctx.session.waitingWalletSetup) {
        await setupWallet(ctx);
    } else if (ctx.session.waitingForBuyAmount) {
        await getBuyAmount(ctx);
    } else if (ctx.session.waitingForSlippage) {
        await getSlippage(ctx);
    } else if (ctx.session.waitingForStopLoss) {
        await getStopLoss(ctx);
    } else if (ctx.session.waitingForTakeProfit) {
        await getTakeProfit(ctx);
    } else if (ctx.session.waitingForForceSell) {
        await tokenForceSell(ctx);
    } else if (ctx.session.waitingForStartDatePnL) {
        await getPnLEndDate(ctx);
    } else if (ctx.session.waitingForEndDate) {
        ctx.session.endDate = ctx.message.text;

        const isDateVaild = validateDate(ctx.session.endDate);
        if (isDateVaild) {
            const replyMarkup = {
                text: isDateVaild,
                options: { reply_markup: backKeyboard }
            };
            await replyOrEdit(ctx, replyMarkup);
            return;
        } else {
            ctx.session.waitingForEndDate = false;
            const { startDate, endDate } = ctx.session;
            return TradeService.sendEODPnLReport(ctx, 'pnl_custom', startDate, ctx.session.endDate);
        }
    }

}

module.exports = { setupHandlersUser, handleTextMessageUser };


