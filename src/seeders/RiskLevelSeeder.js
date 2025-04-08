const db = require('../startup/db');
const mongoose = require("mongoose");
const RiskLevel = require("../models/RiskLevel");
const logger = require('../utils/logger');
const { updateTokenPrice } = require('../utils/updateTokenPrice');

const riskLevels = [
    { min: 0, max: 20, label: "Low Risk", description: "Safe" },
    { min: 21, max: 44, label: "Moderate Risk", description: "Potential concerns" },
    { min: 45, max: 55, label: "High Risk", description: "High risk" },
    { min: 56, max: 100, label: "Super Risk", description: "Likely a scam or rug pull" }
];

async function seedRiskLevels() {
    try {
        await db();
        await RiskLevel.deleteMany(); 
        await RiskLevel.insertMany(riskLevels);
        await updateTokenPrice();
        logger.info("✅ Risk Levels Seeded Successfully");
        process.exit();
    } catch (error) {
        console.error("❌ Error Seeding Risk Levels:", error);
        process.exit(1);
    }
}

seedRiskLevels();

