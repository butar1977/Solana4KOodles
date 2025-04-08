const mongoose = require("mongoose");

const RiskLevelSchema = new mongoose.Schema({
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    label: { type: String, required: true },
    description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("RiskLevel", RiskLevelSchema);
