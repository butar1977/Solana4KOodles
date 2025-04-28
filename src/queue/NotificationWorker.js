const { Worker } = require("bullmq");
const { redisConfig } = require("../../config/radis");
const { sendNotification } = require("../utils/notificationService"); // Import notification helper
const User = require("../../models/User");
const logger = require("../utils/logger");

const NotificationWorker = new Worker(
    "NotificationQueue",
    async (job) => {
        try {
            const { riskLevel, min, max } = job.data;
            logger.info(`📢 Processing risk update for: ${riskLevel} (${min}-${max})`);

            // Fetch users who have opted for notifications
            const users = await User.find({ receiveRiskUpdates: true });

            if (!users.length) {
                logger.info("⚠️ No users subscribed for risk notifications.");
                return;
            }

            const message = `🚨 *Risk Level Update:*\n\n` +
                            `👉 *${riskLevel} Risk* is now updated to *(${min}-${max})*\n\n` +
                            `Stay alert and take necessary actions.`;

            // Send notifications to all subscribed users
            for (const user of users) {
                await sendNotification(user.telegramId, message);
            }

            logger.info(`✅ Sent notifications to ${users.length} users.`);

        } catch (error) {
            console.error("❌ Error in NotificationWorker:", error);
        }
    },
    {
        connection: redisConfig,
        limiter: {
            max: 14, // Max 14 requests per interval
            duration: 60000, // 1 minute (60,000ms)
        },
    }
);

logger.info("✅ NotificationWorker is now listening for jobs...");

module.exports = NotificationWorker;
