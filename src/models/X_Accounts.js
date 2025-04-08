const mongoose = require("mongoose");

const X_AccountSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("X_Account", X_AccountSchema);