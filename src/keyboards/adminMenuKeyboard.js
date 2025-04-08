const { Markup } = require('telegraf');

const adminMenuKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Manage Users', 'manage_users')],
    [Markup.button.callback('⚙ Set Risk Level', 'set_risk_level')],
    // [Markup.button.callback('🔄 Update Token Sources', 'update_token_sources')],
    [Markup.button.callback('📈 Set Auto-Sell Strategy', 'set_auto_sell')],
    // [Markup.button.callback(`📊 System Status`, 'system_status')],
    // [Markup.button.callback('📂 View Logs', 'check_logs')],
    [Markup.button.callback('🔙 Back', 'admin_back')] // Back button
]).reply_markup; // <-- Ensure we return an object


module.exports = adminMenuKeyboard;
//