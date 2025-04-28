const { checkUserRegitered } = require("../handlers/user.handler");
const adminMenuKeyboard = require("../keyboards/adminMenuKeyboard");
const { getUserKeyboard } = require("../keyboards/userKeyboard");
const { checkIfAdmin } = require("../middleware/admin.middleware");
const logger = require("../utils/logger");
const { replyOrEdit } = require("../utils/telegramBot");

module.exports = {
    name: 'start',
    description: 'Start the Bot and show available commands',

    async execute(ctx) {
        const userId = ctx.from.id;
        const isAdmin = await checkIfAdmin(userId);

        let message = `🤖 Bot Started! Welcome to the Solana Trading Bot.`;

        if (isAdmin) {
            return ctx.reply('🔹 Admin Menu', {
                parse_mode: "Markdown",
                reply_markup: adminMenuKeyboard
            });
        } else {

            const isRegistered = await checkUserRegitered(userId);
            logger.info(`'isRegisteredisRegistered', ${isRegistered}`)
            if (isRegistered) {
                return ctx.reply('🔹 User Menu', {
                    parse_mode: "Markdown",
                    reply_markup: await getUserKeyboard(ctx)
                });
            }

            message += "\n\n🔹 *User Commands:*  "
                + "/login - User login ";
        }
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }
};


