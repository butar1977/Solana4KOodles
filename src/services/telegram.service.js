const { Bot } = require('grammy');
const { createHash, createHmac } = require('crypto');

const { TELEGRAM_BOT_TOKEN } = process.env;

// Initialize bot once and export
const bot = new Bot(TELEGRAM_BOT_TOKEN);

exports.bot = bot;
exports.getBotInstance = () => new Bot(TELEGRAM_BOT_TOKEN);


// Send Message Function
exports.sendMessage = async (telegramId, message) => {
  return await bot.api.sendMessage(telegramId, message, { parse_mode: 'HTML' });
};

// Telegram Signature Verification
const secret = createHash('sha256')
  .update(TELEGRAM_BOT_TOKEN)
  .digest();

exports.checkSignature = async ({ hash, ...data }) => {
  const checkString = Object.keys(data)
    .sort()
    .filter((k) => data[k])
    .map(k => (`${k}=${data[k]}`))
    .join('\n');

  const hmac = createHmac('sha256', secret)
    .update(checkString)
    .digest('hex');

  return [hmac === hash, checkString];
};
