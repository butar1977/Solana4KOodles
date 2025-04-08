const Trade = require("../models/Trade");
const { Markup } = require("telegraf");
const User = require("../models/User");

const TRADES_PER_PAGE = 5;

/**
 * Fetch paginated trades and send to Telegram bot
 */
async function viewTrades(ctx, page = 1) {
    try {
        const userId = ctx.from.id;

        const user=await User.findOne({
            telegramId:userId
        })

        const totalTrades = await Trade.countDocuments({userId:user._id});
        const totalPages = Math.ceil(totalTrades / TRADES_PER_PAGE);

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        const trades = await Trade.find({userId:user._id})
            .sort({ executionTime: -1 })
            .skip(((page - 1) * TRADES_PER_PAGE) < 0 ? 0 : ((page - 1) * TRADES_PER_PAGE))
            .limit(TRADES_PER_PAGE);

        if (!trades.length) {
            return ctx.reply("📉 No active trades at the moment.");
        }

        let message = `📊 *Active Trades (Page ${page}/${totalPages}):*\n\n`;
        trades.forEach((trade, index) => {
            message += `#${index + 1}  
💰 *Token:* ${trade.token}  
📅 *Time:* ${new Date(trade.executionTime).toLocaleTimeString()}  
📈 *Trade Type:* ${trade.tradeType}  
🏷️ *Status:* ${trade.status}
${trade.status=='success'?`🔗 [View Transaction](https://solscan.io/tx/${trade.signature})`:`Reason: ${trade.failureReason}`}
\n\n`;
        });

        const buttons = [];
        if (page > 1) buttons.push(Markup.button.callback("⬅️ Previous", `view_trades:${page - 1}`));
        if (page < totalPages) buttons.push(Markup.button.callback("Next ➡️", `view_trades:${page + 1}`));


        ctx.reply(message, {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([buttons]),
        });
    } catch (error) {
        console.error("Error fetching trades:", error);
        ctx.reply("⚠️ Error fetching trade data.");
    }
};


module.exports = {
    viewTrades
}