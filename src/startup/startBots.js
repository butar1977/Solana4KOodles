const botService = require('../services/bot.service');
const telegramBotService = require('../services/telegram.service');

module.exports = async function () {
  const bots = await botService.getBots({ status: 'running' }).populate('user');

  // send restart message
  await Promise.all(
    bots.map(async (bot) => {
      await telegramBotService.sendMessage(
        bot.user.telegramId,
        `Restarting ${bot.name} Bot`
      );
      await botService.startBot(bot._id, false);
    })
  );
};
