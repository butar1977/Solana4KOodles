const { InlineKeyboard } = require('grammy');
const botService = require('../services/bot.service');

module.exports = async function startBot(conversation, ctx) {
  await botService.startBot(bot._id);
};
