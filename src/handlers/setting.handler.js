const adminMenuKeyboard = require('../keyboards/adminMenuKeyboard');
const { isAdmin } = require('../middleware/admin.middleware');
const Setting = require('../models/Setting');
const adminMessage = require("../utils/handlersMessage");
const { replyOrEdit } = require("../utils/telegramBot");



async function getSellProfitLoss() {
    return await Setting.findOne();
}


async function setAutoSell(ctx) {
    try {
        if (!isAdmin(ctx)) return ctx.reply(adminMessage.unauthAccess);

        const regex = /profit=(\d+)\s*stop_loss=(\d+)/;
        const match = ctx.message.text.match(regex);

        if (!match) {
            return ctx.reply("❌ Invalid format! Use: `/set_auto_sell profit=X stop_loss=Y`", { parse_mode: "Markdown" });
        }

        const [_, profit, stopLoss] = match.map(Number);

        if (profit <= 0 || stopLoss <= 0) {
            return ctx.reply("❌ Invalid values! Profit and stop-loss must be positive numbers.");
        }

        await Setting.findOneAndUpdate(
            {},
            { $set: { autoSell_profit: profit, autoSell_stopLoss: stopLoss } },
            { upsert: true }
        );

        ctx.reply(
            `✅ Auto-sell rules updated:\n- Profit: *${profit}%*\n- Stop Loss: *${stopLoss}%*`,
            { parse_mode: "Markdown", reply_markup: adminMenuKeyboard }
        );
    } catch (error) {
        console.error("Error in setAutoSell:", error);
    } finally {
        ctx.session.waitingSetAutoSell = false;
    }
}
module.exports = { setAutoSell, getSellProfitLoss };
