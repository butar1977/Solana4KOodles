const db = require('../startup/db');
const logger = require('../utils/logger');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

async function migrateUserWallets() {
    try {
        await db();

        const users = await User.find({
            privateKey: { $exists: true, $nin: [null, ''] }
        });

        if (users.length === 0) {
            logger.info(`No user found for wallet migration`)
            process.exit(1);
        }

        const walletPayload = users.map(user => {
            return {
                privateKey: user.privateKey,
                user_id: user._id,
                status: true
            }
        })

        await Wallet.deleteMany();
        const res = await Wallet.insertMany(walletPayload);

        logger.info(`✅ User wallet migrated | count : ${JSON.stringify(res.length)}`);
        process.exit();
    } catch (error) {
        console.error("❌ Error migrateUserWallets Levels:", error);
        process.exit(1);
    }
}

migrateUserWallets();
