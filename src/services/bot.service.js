const Bot = require("../models/Bot");
const Factory = require("../web3/contracts/Factory");
const InsufficientFunds = require("../errors/InsufficientFunds");
const Tokens = require("../enums/Tokens");
const orderService = require("./order.service");
const userService = require("./user.service");
const { sendMessage } = require("./telegram.service");
const wait = require("node:timers/promises").setTimeout;
const ms = require("ms");
const _ = require("lodash");
const getSigner = require("../web3/getSigner");
const provider = require("../web3/provider");
const socket = require("../startup/socket");
const events = require("../handlers/user.handler");
const logger = require("../utils/logger");

const { ADMIN_FEE, ADMIN_WALLET_ADDRESS, BLOCK_EXPLORER, TOKEN_M_ADDRESS } =
  process.env;

const factory = new Factory();

exports.createBot = async (botDetails, userId) => {
  const user = await userService.getUserById(userId);
  if (!user) throw new Error("User Not Found");
  return await Bot.create({
    tokenAddress: Tokens[botDetails.name],
    ...botDetails,
    user: user._id,
  });
};

exports.createOrUpdateBot = async (botDetails, userId) => {
  const bot = await this.getBot({ name: botDetails.name, user: userId });
  if (bot) return await this.updateBot(bot._id, botDetails);
  else return await this.createBot(botDetails, userId);
};

exports.getBotById = (id) => Bot.findById(id);

exports.getBot = (filter) => Bot.findOne(filter);

exports.getBots = (filter) => Bot.find(filter);

exports.getLastBot = async (userId) => {
  const bots = await Bot.find({ user: userId }).sort({ updatedAt: "desc" });
  return bots[0];
};

exports.updateBot = async (id, botDetails) => {
  const bot = await this.getBotById(id);
  bot.set(_.omitBy(botDetails, _.isNil));
  await bot.save();
  return bot;
};

exports.getUnRuggedTokens = async () => {
  const isValidBribe = await Promise.all(
    Object.values(Tokens).map((address) => factory.isValidBribe(address))
  );
  return Object.keys(Tokens).filter((_, index) => !isValidBribe[index]);
};

exports.getBotById = (id) => Bot.findById(id);

exports.startBot = async (id, checkRunningStatus = true) => {
  const start = async (id) => {
    // before start
    const bot = await this.getBotById(id).populate("user");
    const { name, amount, slippage, interval, user } = bot;
    const { telegramId, wallet } = await user.populate("wallet");
    const mBalance = await orderService.getTokenBalance(
      TOKEN_M_ADDRESS,
      wallet.address
    );

    try {
      socket.emit(bot.user.socketId, events.start, `${name} Bot Started`);
      await sendMessage(telegramId, `${name} Bot Started`);

      if (Number(mBalance) > 0) {
        const { transactionHash } = await orderService.sellTokens(
          TOKEN_M_ADDRESS,
          mBalance,
          slippage,
          wallet.privateKey
        );
      }

      const feeAmount = (amount * ADMIN_FEE) / 100;
      const buyAmount = amount - feeAmount;
      const feeEth = await orderService.mTokenToEth(feeAmount);
      const balance = await provider.getBalance(wallet.address);
      const gasPrice = await provider.getIncreasedGasPrice();
      const gasFees = gasPrice.mul(23000);
      const value = Number(gasFees) + Number(feeEth);

      if (balance.lt(value)) {
        socket.emit(
          bot.user.socketId,
          events.message,
          `Stopping ${name} Bot due to insufficient ETH \nRequired: ${
            Math.round(value * 100000) / 100000
          } ETH \nBalance: ${Math.round(balance * 100000) / 100000} ETH`
        );
        await sendMessage(
          telegramId,
          `Stopping ${name} Bot due to insufficient ETH \nRequired: ${
            Math.round(value * 100000) / 100000
          } ETH \nBalance: ${Math.round(balance * 100000) / 100000} ETH`
        );
        await this.stopBot(id);
        return bot;
      }
      const signer = getSigner(wallet.privateKey);

      const tx = await signer.sendTransaction({
        to: ADMIN_WALLET_ADDRESS,
        value: feeEth,
        gasPrice,
      });

      await tx.wait();

      if (await this.isBotStopped(id)) return bot;
      socket.emit(
        bot.user.socketId,
        events.message,
        `Buying ${buyAmount} M tokens (2% fees deducted)`
      );
      await sendMessage(
        telegramId,
        `Buying ${buyAmount} M tokens (2% fees deducted)`
      );
      const { transactionHash } = await orderService.buyTokens(
        TOKEN_M_ADDRESS,
        buyAmount,
        slippage,
        wallet.privateKey
      );

      socket.emit(bot.user.socketId, events.message, `M Tokens Buy done`);
      await sendMessage(
        telegramId,
        `M Tokens Buy done <a href="${BLOCK_EXPLORER}/tx/${transactionHash}">View Transaction on Etherscan</a>`
      );
      if (await this.isBotStopped(id)) return bot;

      socket.emit(
        bot.user.socketId,
        events.message,
        `Waiting for ${ms(interval, { long: true })}`
      );
      await sendMessage(
        telegramId,
        `Waiting for ${ms(interval, { long: true })}`
      );
      await wait(interval);

      // sell token
      const sellAmount = await orderService.getTokenBalance(
        TOKEN_M_ADDRESS,
        wallet.address
      );
      if (Number(sellAmount) > 0) {
        if (await this.isBotStopped(id)) return bot;
        socket.emit(
          bot.user.socketId,
          events.message,
          `Selling ${sellAmount} M Tokens`
        );
        await sendMessage(telegramId, `Selling ${sellAmount} M Tokens`);

        const { transactionHash } = await orderService.sellTokens(
          TOKEN_M_ADDRESS,
          sellAmount,
          slippage,
          wallet.privateKey
        );

        socket.emit(bot.user.socketId, events.message, `M Tokens Sell done`);
        await sendMessage(
          telegramId,
          `M Tokens Sell done <a href="${BLOCK_EXPLORER}/tx/${transactionHash}">View Transaction</a>`
        );
        if (await this.isBotStopped(id)) return bot;

        socket.emit(
          bot.user.socketId,
          events.message,
          `Waiting for ${ms(interval, { long: true })}`
        );
        await sendMessage(
          telegramId,
          `Waiting for ${ms(interval, { long: true })}`
        );
        await wait(interval);
      }
    } catch (error) {
      if (error instanceof InsufficientFunds) {
        socket.emit(
          bot.user.socketId,
          events.message,
          `Stopping ${name} Bot due to insufficient ETH \nRequired: ${
            Math.round(error.required * 100000) / 100000
          } ETH \nBalance: ${Math.round(error.balance * 100000) / 100000} ETH`
        );
        await sendMessage(
          telegramId,
          `Stopping ${name} Bot due to insufficient ETH \n<b>Required</b>: ${
            Math.round(error.required * 100000) / 100000
          } ETH \n<b>Balance</b>: ${
            Math.round(error.balance * 100000) / 100000
          } ETH`
        );
        await this.stopBot(id);
        return bot;
      }
      logger.error(error);
      await this.stopBot(id);
      return bot;
    }

    while (true) {
      const bot = await this.getBotById(id).populate("user");

      const { name, tokenAddress, status, amount, slippage, interval, user } =
        bot;
      const { telegramId, wallet } = await user.populate("wallet");

      if (status === "stopped") return bot;

      try {
        // sell token
        const sellAmount = await orderService.getTokenBalance(
          tokenAddress,
          wallet.address
        );
        if (Number(sellAmount) > 0) {
          if (await this.isBotStopped(id)) return bot;
          socket.emit(
            user.socketId,
            events.message,
            `${name} Bot Selling ${sellAmount} Tokens`
          );
          await sendMessage(
            telegramId,
            `${name} Bot Selling ${sellAmount} Tokens`
          );
          const { transactionHash } = await orderService.sellTokens(
            tokenAddress,
            sellAmount,
            slippage,
            wallet.privateKey
          );
          socket.emit(user.socketId, events.message, `${name} Bot Sell done`);
          await sendMessage(
            telegramId,
            `${name} Bot Sell done <a href="${BLOCK_EXPLORER}/tx/${transactionHash}">View Transaction</a>`
          );
          if (await this.isBotStopped(id)) return bot;
          socket.emit(
            user.socketId,
            events.message,
            `${name} Bot Waiting for ${ms(interval, { long: true })}`
          );
          await sendMessage(
            telegramId,
            `${name} Bot Waiting for ${ms(interval, { long: true })}`
          );
          await wait(interval);
        }

        // buy token
        if (await this.isBotStopped(id)) return bot;
        socket.emit(
          user.socketId,
          events.message,
          `${name} Bot Buying ${amount} Tokens`
        );
        await sendMessage(telegramId, `${name} Bot Buying ${amount} Tokens`);
        const { transactionHash } = await orderService.buyTokens(
          tokenAddress,
          amount,
          slippage,
          wallet.privateKey
        );
        socket.emit(user.socketId, events.message, `${name} Bot Buy done`);
        await sendMessage(
          telegramId,
          `${name} Bot Buy done <a href="${BLOCK_EXPLORER}/tx/${transactionHash}">View Transaction on Etherscan</a>`
        );
        if (await this.isBotStopped(id)) return bot;
        socket.emit(
          user.socketId,
          events.message,
          `${name} Bot Waiting for ${ms(interval, { long: true })}`
        );
        await sendMessage(
          telegramId,
          `${name} Bot Waiting for ${ms(interval, { long: true })}`
        );
        await wait(interval);
      } catch (error) {
        if (error instanceof InsufficientFunds) {
          socket.emit(
            user.socketId,
            events.message,
            `Stopping ${name} Bot due to insufficient ETH \nRequired: ${
              Math.round(error.required * 100000) / 100000
            } ETH \nBalance: ${Math.round(error.balance * 100000) / 100000} ETH`
          );
          await sendMessage(
            telegramId,
            `Stopping ${name} Bot due to Insufficient ETH \n<b>Required</b>: ${
              Math.round(error.required * 100000) / 100000
            } ETH \n<b>Balance</b>: ${
              Math.round(error.balance * 100000) / 100000
            } ETH`
          );
          await this.stopBot(id);
          return bot;
        }
        console.log(error);
      }
    }
  };

  const bot = await this.getBotById(id).populate("user");
  const { telegramId } = bot.user;

  // check rug status
  const rugged = await factory.isValidBribe(bot.tokenAddress);
  if (rugged) throw new Error("Cannot Start Bot for Rugged Token");

  // check running status
  if (checkRunningStatus && bot.status === "running")
    throw new Error(`${bot.name} Bot already running`);

  bot.status = "running";
  await bot.save();

  start(id).then((bot) => {
    socket.emit(bot.user.socketId, events.stop, `${bot.name} Bot Stopped`);
    sendMessage(telegramId, `${bot.name} Bot Stopped`);
  });

  return bot;
};

exports.stopBot = async (id) => {
  const bot = await this.getBotById(id);
  if (bot.status === "stopped") throw new Error("Bot already stopped");
  bot.status = "stopped";
  await bot.save();
  return bot;
};

exports.isBotStopped = async (id) => {
  const bot = await this.getBotById(id);
  return bot.status === "stopped";
};
