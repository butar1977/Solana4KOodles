const { InlineKeyboard } = require('grammy');
const adminMenuKeyboard = require('../keyboards/adminMenuKeyboard'); // Import the keyboard
const { getUserKeyboard } = require('../keyboards/userKeyboard');

async function replyOrEdit(ctx, markup) {
    try {
        if (!ctx.session) {
            ctx.session = {}; // Initialize session if null
        }
        ctx.session.botLastMessage = await ctx.reply(markup.text, markup.options);
    } catch (error) {
        console.error('Failed to send or edit message:', error);

        if (!ctx.session) {
            ctx.session = {}; // Ensure session exists
        }

        ctx.session.botLastMessage = await ctx.reply(markup.text, markup.options);
    }
}



const backKeyboard = new InlineKeyboard()
    .text('Back', 'admin_back').row();
const backKeyboardUser = new InlineKeyboard()
    .text('Back', 'user_back').row();


async function backMenu(ctx, text = null, isAdminAccess = false) {
    const backMarkup = {
        text: text || '🔙 Returning to Admin Panel...',
        options: { parse_mode: 'Markdown', reply_markup: isAdminAccess ? adminMenuKeyboard : await getUserKeyboard(ctx) }
    };

    await replyOrEdit(ctx, backMarkup);
    await resetFlags(ctx);
}
function sanitizeMessage(message) {
    return message.replace(/[`*_]/g, ''); // Removes backticks, asterisks, and underscores to avoid Markdown issues
}


async function resetFlags(ctx) {
    ctx.session.addUserHandle = false;
    ctx.session.removeUserHandle = false;
    ctx.session.viewUserHandle = false;
    ctx.session.waitingRiskUpdate = false;
    ctx.session.waitingWalletSetup = false;
    ctx.session.waitingForBuyAmount = false;
    ctx.session.waitingForSlippage = false;
    ctx.session.waitingSetAutoSell = false;
    ctx.session.waitingUpdateUserWalletPk = false;
    ctx.session.waitingUpdateUserWallet = false;
    ctx.session.waitingUpdateUserWalletUser = false;
}

function getStartOfDay(date = new Date()) {
    return new Date(date.setUTCHours(0, 0, 0, 0)).toISOString();
}

function getEndOfDay(date = new Date()) {
    return new Date(date.setUTCHours(23, 59, 59, 999)).toISOString();
}
function getDateRanges(action, customStartDate, customEndDate) {
    let startDate, endDate;

    if (action === "pnl_today") {
        startDate = getStartOfDay();
        endDate = getEndOfDay();
    } else if (action === "pnl_7days") {
        startDate = getStartOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        endDate = getEndOfDay();
    } else if (action === "pnl_30days") {
        startDate = getStartOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        endDate = getEndOfDay();
    } else if (action === "pnl_custom" && customStartDate && customEndDate) {
        // Parse custom dates
        startDate = getStartOfDay(new Date(customStartDate));
        endDate = getEndOfDay(new Date(customEndDate));
    } else {
        throw new Error("Invalid action or missing custom dates");
    }

    return { startDate, endDate };
}

module.exports = {
    replyOrEdit,
    backMenu,
    backKeyboard,
    backKeyboardUser,
    sanitizeMessage,
    getStartOfDay,
    getEndOfDay,
    getDateRanges
};