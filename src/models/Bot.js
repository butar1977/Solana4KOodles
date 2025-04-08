const mongoose = require('mongoose');
const ms = require('ms');
const Tokens = require('../enums/Tokens');

const botSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: Object.keys(Tokens),
      set: (v) => v.toUpperCase(),
    },
    tokenAddress: {
      type: String,
      required: true,
      enum: Object.values(Tokens).map((v) => v.toLowerCase()),
      set: (v) => v.toLowerCase(),
    },
    status: {
      type: String,
      required: true,
      enum: ['running', 'stopped'],
      default: 'stopped',
    },
    amount: {
      type: String,
      required: true,
    },
    slippage: {
      type: Number,
      required: true,
    },
    interval: {
      type: Number,
      required: true,
      set: (v) => ms(v),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

botSchema.methods.reload = async function () {
  const record = await this.constructor.findById(this);
  Object.assign(this, record);
  return record;
};

const Bot = mongoose.model('Bot', botSchema);

module.exports = Bot;
