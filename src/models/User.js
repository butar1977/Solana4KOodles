const { default: mongoose } = require('mongoose');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');

const AES_SECRET_KEY = process.env.AES_SECRET_KEY || "your_strong_secret_key";

const userSchema = mongoose.Schema({
  name: {
    type: String,
  },
  telegramId: {
    type: Number,
  },
  username: {
    type: String,
  },
  walletAddress: {
    type: String
  },
  socketId: {
    type: String,
  },
  status: {
    type: Boolean,
    default: true
  },
  password: {
    type: String,
    unique: true,
    required: true
  },
  privateKey: {
    type: String,
    get: (pk) => pk ? CryptoJS.AES.decrypt(pk, AES_SECRET_KEY).toString(CryptoJS.enc.Utf8) : null,
    set: (pk) => CryptoJS.AES.encrypt(pk, AES_SECRET_KEY).toString(),
  },
  buyAmount: {
    type: Number,
    default: 0
  },
  slippage: {
    type: Number,
    default: 0.5
  },

  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  tradeEnabled: {
    type: Boolean,
    default: true
  },
  stopLoss: {
    type: Number,
    default: 0
  },
  takeProfit: {
    type: Number,
    default: 0
  },
  last4TxnFailed:{
    type: Boolean,
    default: false
  }

},
  {
    timestamps: true,
    toJSON: { getters: true }, toObject: { getters: true }
  }
);

userSchema.methods.hashPassword = async function () {
  this.password = await bcrypt.hash(this.password, 10);
};

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;