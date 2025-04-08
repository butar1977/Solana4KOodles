const userService = require("../services/user.service");
const walletService = require("../services/wallet.service");
const telegramService = require("../services/telegram.service");

module.exports = async (ctx, next) => {
  const { id: telegramId, username, first_name, last_name } = ctx.from;

  const userDetails = {
    telegramId,
    username,
    name: first_name + " " + last_name,
  };

  let user = await userService.getUser({ telegramId });

  if (!user) {
    await telegramService.sendMessage(
      telegramId,
      "<b>Creating your wallet</b>",
      { parse_mode: "HTML" }
    );
    ctx.reply(
      "To use the bot, transfer Ethereum to the created address. This will be used for the gas, as well as the buy/sell transactions."
    );
    user = await userService.createUser(userDetails);
    const walletInfo = await walletService.getWalletInfoMessage(user.wallet);
    await telegramService.sendMessage(telegramId, ...walletInfo);
    return ctx.reply(
      "Each time you use the bot, it will first perform 1 buy and sell of the M token, and take a 2% fee. After that, it will wash the chosen letter until the user chooses to stop the bot, or there is no longer sufficient Ethereum to perform the transaction."
    );
  } else {
    user = await userService.updateUser(user._id, userDetails);
  }

  await next();
};
