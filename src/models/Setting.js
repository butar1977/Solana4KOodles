const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    autoSell_profit: { type: Number, default: 0 },
    autoSell_stopLoss: { type: Number, default: 0 },
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;
