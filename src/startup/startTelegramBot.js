const { session } = require('grammy');

const telegramService = require('../services/telegram.service');
const registerCommands = require('../utils/registerCommands');
const setupHandlers = require('../actions/adminActions');
const { setupHandlersUser } = require('../actions/userActions');
const logger = require('../utils/logger');

module.exports = async function () {
  const bot = telegramService.getBotInstance();
  
  bot.use(session({ initial() { return {}; } }));
  await registerCommands(bot);

  bot.start();
  bot.catch(console.error);

  setupHandlers(bot)
  setupHandlersUser(bot)
  const data = await bot.api.getMe();
  logger.info(`Telegram Bot now Online!`);
  logger.info(`Bot name: ${data.first_name}`);
  logger.info(`Bot Username: @${data.username}`);
};
