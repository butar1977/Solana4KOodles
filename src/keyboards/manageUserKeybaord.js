const { Markup } = require('telegraf');

const manageUserKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('➕ Add User', 'add_user')],
    [Markup.button.callback('❌ Remove User', 'remove_user')],
    [Markup.button.callback('👤 View Users', 'view_users')],
    [Markup.button.callback('🔄 Update User Wallet', 'update_user_wallet')],
    [Markup.button.callback('🔙 Back', 'admin_back')] // Back button
]).reply_markup;

module.exports = manageUserKeyboard;
