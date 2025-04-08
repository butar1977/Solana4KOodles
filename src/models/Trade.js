const mongoose = require("mongoose");

const TradeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    amount: { type: Number, required: true },

    inAmount: { type: Number, default: 0 },
    outAmount: { type: Number, default: 0 },
    feeAmount: { type: Number, default: 0 },
    tokenPriceAtPurchase: { type: Number, default: null },

    tradeType: { type: String, enum: ["buy", "sell"], required: true },
    status: { type: String, enum: ["pending", "executed", "failed", "success"], default: "pending" },
    riskLevel: { type: String, required: true },
    slippage: { type: Number, default: 0.5 },
    stopLoss: { type: Number, default: null },
    takeProfit: { type: Number, default: null },
    executionTime: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    signature: { type: String, default: '' },
    failureReason: { type: String, default: null }, // New field for failure tracking,

    tokenPriceAtSell: { type: Number, default: null },
    unrealizedProfit: { type: Number, default: 0 },
    realizedProfit: { type: Number, default: 0 },
    decimals: { type: Number, default: 0 },
    msg: { type: String, default: '' }
}, {
    timestamps: true
});

const Trade = mongoose.model("Trade5", TradeSchema);
module.exports = Trade
