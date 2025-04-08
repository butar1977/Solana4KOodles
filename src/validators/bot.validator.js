const { ethers } = require('ethers');
const Joi = require('joi');
const ms = require('ms');
const Factory = require("../web3/contracts/Factory");

const {
  BOT_MAX_BUY_AMOUNT,
  BOT_MINIMUM_SLIPPAGE,
  BOT_MINIMUM_INTERVAL,
  DEAD_ADDRESS,
  ZERO_ADDRESS,
} = process.env;

const factory = new Factory()

exports.validateAddress = (address) => {
  return Joi.object({
    address: Joi.string()
      .custom((value, helper) => {
        if (!ethers.utils.isAddress(value) || value === DEAD_ADDRESS || value === ZERO_ADDRESS)
          return helper.message('Invalid address');
        return true;
      })
      .required(),
  }).validate({ address });
};

exports.validateAmount = (amount) => {
  return Joi.object({
    amount: Joi.number().greater(0).max(Number(BOT_MAX_BUY_AMOUNT)),
  }).validate({ amount });
};

exports.validateSlippage = async (slippage) => {
  const minimumSlippage = parseInt(await factory.slippage())/10
  return Joi.object({
    slippage: Joi.number().min(Number(minimumSlippage)).less(50),
  }).validate({ slippage });
};

exports.validateInterval = (interval) => {
  return Joi.object({
    interval: Joi.string().custom((value, helper) => {
      if (!ms(value))
        return helper.message(`"interval" is must be a valid interval`);
      if (ms(value) < Number(ms(BOT_MINIMUM_INTERVAL)))
        return helper.message(
          `"interval" must be greater then or equal to ${BOT_MINIMUM_INTERVAL}`
        );
      return true;
    }),
  }).validate({ interval });
};

exports.validateBot = async (bot, validTokens) => {
  const minimumSlippage = parseInt(await factory.slippage())/10
  return Joi.object({
    name: Joi.string()
      .valid(...validTokens)
      .required(),
    amount: Joi.number().greater(0).max(Number(BOT_MAX_BUY_AMOUNT)).required(),
    slippage: Joi.number().min(Number(minimumSlippage)).less(50).required(),
    interval: Joi.string()
      .custom((value, helper) => {
        if (!ms(value))
          return helper.message(`"interval" is must be a valid interval`);
        if (ms(value) < Number(ms(BOT_MINIMUM_INTERVAL)))
          return helper.message(
            `"interval" must be greater then or equal to ${BOT_MINIMUM_INTERVAL}`
          );
        return true;
      })
      .required(),
  }).validate(bot);
};

exports.validateUpdateBot = async (bot, validTokens) => {
  const minimumSlippage = parseInt(await factory.slippage())/10
  return Joi.object({
    name: Joi.string()
      .valid(...validTokens)
      .required(),
    amount: Joi.number().greater(0).max(Number(BOT_MAX_BUY_AMOUNT)),
    slippage: Joi.number().min(Number(minimumSlippage)).less(50),
    interval: Joi.string()
      .custom((value, helper) => {
        if (!ms(value))
          return helper.message(`"interval" is must be a valid interval`);
        if (ms(value) < Number(ms(BOT_MINIMUM_INTERVAL)))
          return helper.message(
            `"interval" must be greater then or equal to ${BOT_MINIMUM_INTERVAL}`
          );
        return true;
      }),
  }).validate(bot);
};
