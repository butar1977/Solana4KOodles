const mongoose = require("mongoose");

const TokenPriceSchema = new mongoose.Schema({
    token: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, required: true, index: true }, // Store price date
}, {
    timestamp: { type: Date, default: Date.now, index: { expires: '60d' } } // TTL index of 60 days
});

const TokenPrice = mongoose.model("TokenPrice", TokenPriceSchema);
module.exports = TokenPrice;
