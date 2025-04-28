const { Bot } = require('grammy');
const { createHash, createHmac } = require('crypto');

const { TELEGRAM_BOT_TOKEN } = process.env;

// Initialize bot once and export
const bot = new Bot(TELEGRAM_BOT_TOKEN);

exports.bot = bot;
exports.getBotInstance = () => new Bot(TELEGRAM_BOT_TOKEN);