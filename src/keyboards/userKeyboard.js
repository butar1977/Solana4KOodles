const { Markup } = require("telegraf");
const User = require("../models/User");

async function getUserKeyboard(ctx) {
    try {
        const telegramId = ctx.from.id;

        const user = await User.findOne({ telegramId });
        const notificationsEnabled = user?.notificationsEnabled ?? true; // Default to true
        const tradeEnabled = user?.tradeEnabled ?? false;

        return Markup.inlineKeyboard([
            [Markup.button.callback("🔧 Manage Wallets", "manage_wallets")],
            [Markup.button.callback("📊 Set Buy Params", "set_buy_params")],
            [Markup.button.callback("📊 Set Sell", "set_stop_loss")],
            [Markup.button.callback("📜 View Trades", "view_trades")],
            [Markup.button.callback("💰 Force Sell", "force_sell")],
            [Markup.button.callback("💸 View PnL", "view_pnl")],
            [
                Markup.button.callback(
                    `🔔 Notifications ${notificationsEnabled ? "✅" : "❌"}`,
                    "toggle_notifications"
                )
            ],
            [
                Markup.button.callback(
                    `📜 Bot Trade Status : ${tradeEnabled ? "Running ✅" : "Paused ❌"}`,
                    "toggle_trade_status"
                )
            ]
        ]).reply_markup;
    } catch (error) {
        console.error("Error fetching user keyboard:", error);
        return Markup.inlineKeyboard([
            [Markup.button.callback("🔧 Manage Wallets", "manage_wallets")],
            [Markup.button.callback("📊 Set Buy Params", "set_buy_params")],
            [Markup.button.callback("📊 Set Sell", "set_stop_loss")],
            [Markup.button.callback("📜 View Trades", "view_trades")],
            [Markup.button.callback("💰 Force Sell", "force_sell")],
            [Markup.button.callback("💸 View PnL", "view_pnl")],
            [
                Markup.button.callback(
                    `🔔 Notifications ${notificationsEnabled ? "✅" : "❌"}`,
                    "toggle_notifications"
                )
            ],
            [
                Markup.button.callback(
                    `📜 Bot Trade Status : ${tradeEnabled ? "Running ✅" : "Paused ❌"}`,
                    "toggle_trade_status"
                )
            ]

        ]).reply_markup;
    }
}


async function confirmUserSellParams() {
    return Markup.inlineKeyboard([
        [Markup.button.callback("Yes", "set_stop_loss")],
        [Markup.button.callback("Back", 'user_back')],
    ]).reply_markup;
}

async function pnlKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback("Today", "pnl_today")],
        [Markup.button.callback("Last 7 Days", "pnl_7days")],
        [Markup.button.callback("Custom Range", "pnl_custom")]
    ]).reply_markup;
}


module.exports = { getUserKeyboard, confirmUserSellParams, pnlKeyboard };
