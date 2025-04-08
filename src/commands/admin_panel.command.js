const { isAdmin } = require('../middleware/admin.middleware');
const { replyOrEdit } = require('../utils/telegramBot');
const adminMenuKeyboard = require('../keyboards/adminMenuKeyboard'); // Import the keyboard

module.exports = {
    name: 'admin_panel',
    description: 'Access the admin panel',

    async execute(ctx) {
        await isAdmin(ctx, async () => {
            const replyMarkup = {
                text: '⚙ *Admin Panel:* Choose an option below:',
                options: { parse_mode: 'Markdown', reply_markup: adminMenuKeyboard } // Ensure proper structure
            };
            await replyOrEdit(ctx, replyMarkup);
        });
    }
};
