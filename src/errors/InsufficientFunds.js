const { ethers } = require("ethers");

module.exports = class InsufficientFunds extends Error {
  constructor(required, balance) {
    super('Insufficient Funds');
    this.required = ethers.utils.formatEther(required);
    this.balance = ethers.utils.formatEther(balance);
  }
}