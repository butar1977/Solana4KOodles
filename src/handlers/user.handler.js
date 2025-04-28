const { Keypair } = require("@solana/web3.js");
const adminMenuKeyboard = require("../keyboards/adminMenuKeyboard");
const manageUserKeyboard = require("../keyboards/manageUserKeybaord");
const { isAdmin } = require("../middleware/admin.middleware");
const User = require("../models/User");
const adminMessage = require("../utils/handlersMessage");
const { backKeyboard } = require("../utils/telegramBot");
const bs58 = require("bs58");
const { getUserKeyboard, confirmUserSellParams } = require("../keyboards/userKeyboard");
const { getUserPublicKey, getUserHoldingsToken } = require("../utils/solanaHelper");
const { executeTrade } = require("../services/Trade.service");
const logger = require("../utils/logger");
const Wallet = require("../models/Wallet");
const { Markup } = require("telegraf");


/**
 * Handles the addition of a new user.
 *
 * This function checks if the current user has admin privileges, validates the 
 * provided password, and ensures that the user does not already exist. If all 
 * conditions are met, it hashes the password and saves the new user to the database.
 *
 * @async
 * @function addUser
 * @param {Object} ctx - The context object provided by the Telegram bot framework.
 * @param {Object} ctx.message - The message object containing user input.
 * @param {string} ctx.message.text - The text of the message, expected to contain the password.
 * @returns {Promise<void>} Sends a reply to the user indicating the result of the operation.
 *
 * @throws {Error} Logs and replies with an error message if an exception occurs during execution.
 */
async function addUser(ctx) {
    try {
        if (!await isAdmin(ctx)) return ctx.reply(adminMessage.unauthAccess);

        const password = ctx.message.text;
        if (!password) return ctx.reply(adminMessage.passwordRequired);
        ctx.session.addUserHandle = false;

        // Fetch all users and check password manually
        const users = await User.find();
        for (let user of users) {
            if (await user.comparePassword(password)) {
                return ctx.reply(`${adminMessage.userExist}`, {
                    parse_mode: "Markdown",
                    reply_markup: manageUserKeyboard
                });
            }
        }

        let user = new User({ password });
        await user.hashPassword(); // 🔒 Hash password before saving
        await user.save();
        return ctx.reply(adminMessage.userAdded, {
            parse_mode: "Markdown",
            reply_markup: adminMenuKeyboard
        });
    } catch (error) {
        console.error("Error adding user:", error);
        return ctx.reply("❌ Failed to add user.");
    }
}
async function removeUser(ctx) {
    try {
        if (!await isAdmin(ctx)) return ctx.reply(adminMessage.unauthAccess);

        const password = ctx.message.text;
        if (!password) return ctx.reply(adminMessage.passwordRequired);
        ctx.session.removeUserHandle = false;

        // Fetch all users and check password manually
        const users = await User.find();
        for (let user of users) {
            if (await user.comparePassword(password) && user.status) {
                user.status = false;
                await user.save();
                return ctx.reply(`✅ User ${user.username ?? "Unknown"} removed successfully.`, {
                    parse_mode: "Markdown",
                    reply_markup: adminMenuKeyboard
                });
            }
        }
        return ctx.reply(adminMessage.userNotFound, {
            parse_mode: "Markdown",
            reply_markup: adminMenuKeyboard
        }
        );
    } catch (error) {
        console.error("Error removing user:", error);
        return ctx.reply("❌ Failed to remove user.");
    }
}
async function viewUser(ctx) {
    try {
        if (! await isAdmin(ctx)) return ctx.reply(adminMessage.unauthAccess);

        const password = ctx.message.text;
        if (!password) return ctx.reply(adminMessage.passwordRequired);

        ctx.session.viewUserHandle = false

        // Fetch all users and check password manually
        const users = await User.find();
        for (let user of users) {
            if (await user.comparePassword(password)) {
                const text = `👤 *User Details:*
🔹 *Username:* @${user.username ?? "NA"}
🔹 *Status:* ${user.status ? "Active" : "Disabled"}
🔹 *Wallet Address:* ${user.walletAddress ?? "NA"}`

                return ctx.reply(text, {
                    parse_mode: "Markdown",
                    reply_markup: backKeyboard
                });
            }
        }
        return ctx.reply(adminMessage.userNotFound);
    } catch (error) {
        console.error("Error fetching user details:", error);
        return ctx.reply("❌ Failed to fetch user details.");
    }
}
async function verifyPassword(ctx) {
    try {
        if (!ctx.session.waitingForPassword) return;

        const password = ctx.message.text;
        const users = await User.find({ status: true });

        for (let user of users) {
            if (await user.comparePassword(password)) {

                user.telegramId = ctx.from.id;
                user.name = ctx.from.first_name;

                await user.save();

                ctx.session.isAuthenticated = true;
                ctx.session.waitingForPassword = false;
                return ctx.reply("✅ Login successful! You can now use all features.", {
                    parse_mode: "Markdown",
                    reply_markup: await getUserKeyboard(ctx)
                });
            }
        }

        return ctx.reply("❌ You are not registered. \n\n🔹 *User Commands:*  "
            + "/login - User login");
    } catch (error) {
        console.error("Error in verifyPassword:", error);
        ctx.reply("⚠️ An error occurred. Please try again later.");
    } finally {
        ctx.session.waitingForPassword = false;
    }
}
async function checkUserRegitered(telegramId) {
    return !!(await User.findOne({ telegramId }));
}
async function setupWallet(ctx) {
    try {
        const userId = ctx.from.id;
        const userMessage = ctx.message.text.trim();

        try {
            Keypair.fromSecretKey(bs58.default.decode(userMessage));

        } catch (err) {
            return ctx.reply(adminMessage.invaildPrivateKey, {
                parse_mode: "Markdown",
                reply_markup: await getUserKeyboard(ctx)
            });
        }

        // Store private key securely (Mongoose handles encryption)
        await User.findOneAndUpdate(
            { telegramId: userId },
            { privateKey: userMessage },
            { upsert: true, new: true }
        );

        return ctx.reply(adminMessage.accountLinked, {
            parse_mode: "Markdown",
            reply_markup: await getUserKeyboard(ctx)
        });

    } catch (error) {
        console.error("Error in setupWallet:", error);
        return ctx.reply("⚠️ *An error occurred while setting up your wallet.* Please try again later.", {
            parse_mode: "Markdown",
            reply_markup: await getUserKeyboard(ctx)
        });
    } finally {
        ctx.session.waitingWalletSetup = false;
    }
}
async function checkWalletSetup(ctx) {
    try {
        const userId = ctx.from.id;
        const user = await User.findOne({ telegramId: userId });
        return !!(user?.privateKey);
    } catch (error) {
        console.error("Error in checkWalletSetup:", error);
        return ctx.reply("⚠️ An error occurred while checking your wallet setup. Please try again later.");
    }
}
async function getBuyAmount(ctx) {
    try {
        const buyAmount = parseFloat(ctx.message.text.trim());

        if (isNaN(buyAmount) || buyAmount <= 0) {
            return ctx.reply(adminMessage.invalidAmount);
        }

        // Store buy amount and prompt for slippage
        ctx.session.buyAmount = buyAmount;
        ctx.session.waitingForBuyAmount = false;
        ctx.session.waitingForSlippage = true;

        return ctx.reply(adminMessage.enterSlippage);
    } catch (error) {
        ctx.session.waitingForBuyAmount = false;
        ctx.session.waitingForSlippage = false;
        console.error("Error in handleBuyAmount:", error);
        return ctx.reply("⚠️ An error occurred. Please try again.");
    } finally {
        ctx.session.waitingForBuyAmount = false;
    }
}
async function getSlippage(ctx) {
    try {
        const userId = ctx.from.id;
        const slippage = parseFloat(ctx.message.text.trim());

        if (isNaN(slippage) || slippage < 0 || slippage > 50) {
            return ctx.reply(adminMessage.invalidSlippage);
        }

        // Store in database
        await User.findOneAndUpdate(
            { telegramId: userId },
            { buyAmount: ctx.session.buyAmount, slippage: slippage },
            { upsert: true, new: true }
        );

        ctx.session.waitingForSlippage = false;
        return await ctx.reply(`✅ *Buy parameters updated!*\n\n🔹 Buy Amount: ${ctx.session.buyAmount}\n🔹 Slippage: ${slippage}%\n Do you also want to update sell params?`,
            {
                parse_mode: "Markdown",
                reply_markup: await confirmUserSellParams()
            });

    } catch (error) {
        ctx.session.waitingForSlippage = false;
        ctx.session.waitingForBuyAmount = false;

        console.error("Error in handleSlippage:", error);
        return ctx.reply("⚠️ An error occurred. Please try again.");
    } finally {
        ctx.session.waitingForBuyAmount = false;
    }
}

async function getStopLoss(ctx) {
    try {
        const stopLoss = parseFloat(ctx.message.text.trim());

        if (isNaN(stopLoss) || stopLoss <= 0 || stopLoss > 100) {
            return ctx.reply("⚠️ Invalid Stop Loss value. Please enter a positive number.");
        }

        // Store Stop Loss in session
        ctx.session.stopLoss = stopLoss;
        ctx.session.waitingForStopLoss = false;
        ctx.session.waitingForBuyAmount = false;
        ctx.session.waitingForSlippage = false;
        ctx.session.waitingForTakeProfit = true;

        return ctx.reply("📈 Enter Take Profit value:");
    } catch (error) {
        ctx.session.waitingForStopLoss = false;
        ctx.session.waitingForTakeProfit = false;

        console.error("Error in getStopLoss:", error);
        return ctx.reply("⚠️ An error occurred. Please try again.");
    }
}

async function getTakeProfit(ctx) {
    try {
        const userId = ctx.from.id;
        const takeProfit = parseFloat(ctx.message.text.trim());


        if (isNaN(takeProfit) || takeProfit <= 0) {
            return ctx.reply("⚠️ Invalid Take Profit value. Please enter a positive number.");
        }

        // Store in database
        await User.findOneAndUpdate(
            { telegramId: userId },
            {
                stopLoss: ctx.session.stopLoss,
                takeProfit: takeProfit
            },
            { upsert: true, new: true }
        );

        ctx.session.waitingForTakeProfit = false;
        ctx.session.waitingForBuyAmount = false;
        ctx.session.waitingForSlippage = false;

        logger.info(`Stop loss and Take profit updated for buy trades  `)
        return ctx.reply(
            `✅ *Trade parameters updated!*\n\n🔹 Stop Loss: ${ctx.session.stopLoss}\n🔹 Take Profit: ${takeProfit}`,
            {
                parse_mode: "Markdown",
                reply_markup: await getUserKeyboard(ctx)
            }
        );
    } catch (error) {
        ctx.session.waitingForTakeProfit = false;
        console.error("Error in getTakeProfit:", error);
        return ctx.reply("⚠️ An error occurred. Please try again.");
    }
}


async function getUserDetails(ctx, fields) {
    try {
        const query = { telegramId: ctx.from.id }
        if (!fields || fields.length === 0) {
            throw new Error("Fields array is required.");
        }

        // Create projection object dynamically
        const projection = fields.reduce((acc, field) => {
            acc[field] = 1;
            return acc;
        }, {});

        // Fetch user data
        const user = await User.findOne(query, projection).lean();
        return user || {};
    } catch (error) {
        console.error("Error in getUserDetails:", error);
        return {};
    }
}
async function isNotificationEnabled(ctx) {
    try {
        const telegramId = ctx.from.id;

        const user = await User.findOne({ telegramId }, "notificationsEnabled").lean();
        return user?.notificationsEnabled ?? true;
    } catch (error) {
        console.error("Error fetching notification preference:", error);
        return true;
    }
}
async function updateNotificationPreference(ctx) {
    try {
        const telegramId = ctx.from.id;

        const user = await User.findOne({ telegramId }, "notificationsEnabled");
        const currentState = user?.notificationsEnabled ?? true;

        const newState = !currentState;

        await User.findOneAndUpdate({ telegramId }, { notificationsEnabled: newState }, { upsert: true });

        return true;
    } catch (error) {
        console.error("Error updating notification preference:", error);
        return false;
    }
}
async function updateTradeToggle(ctx) {
    try {
        const telegramId = ctx.from.id;

        const user = await User.findOne({ telegramId });
        const currentState = user?.tradeEnabled ?? true;
        const newState = !currentState;
        await User.findOneAndUpdate({ telegramId }, { tradeEnabled: newState }, { upsert: true });
        return true;
    } catch (error) {
        console.error("Error updating tradeEnabled preference:", error);
        return false;
    }
}

async function tokenForceSell(ctx) {
    try {
        const telegramId = ctx.from.id;
        const token = ctx.message.text.trim();

        const user = await User.findOne({ telegramId });

        const publicKey = await getUserPublicKey(user.privateKey);
        const holdings = await getUserHoldingsToken(publicKey, token);

        if (!holdings || holdings.amount === 0) {
            logger.info(`❌ No holdings found for token ${token}. Skipping force sell.`);
            return ctx.reply("No holdings found for this token.", { reply_markup: await getUserKeyboard(ctx) });
        }

        const payload = {
            userId: user._id,
            userPublicKey: publicKey,
            userPrivateKey: user.privateKey,
            token,
            amount: holdings.amount * (10 ** holdings.decimals), // Selling entire balance
            tradeType: "sell",
            riskLevel: "forced",
            slippage: user.slippage,
            stopLoss: 0,
            takeProfit: 0
        }


        logger.info(`payload  ${JSON.stringify(payload)}`)
        const trade = await executeTrade(payload);

        if (trade.success) {
            return ctx.reply(`🛑 Force selling started ${payload.amount} of ${token}`);

        }
    } catch (error) {
        logger.error(`Force sell error  ${error}`)
        return ctx.reply(`🛑 Force selling ${holdings.balance} of ${token}`);

    }
}
async function updateUserWallet(ctx) {
    try {
        if (!await isAdmin(ctx)) return ctx.reply(adminMessage.unauthAccess);

        const password = ctx.message.text;
        if (!password) return ctx.reply(adminMessage.passwordRequired);
        ctx.session.waitingUpdateUserWallet = false;

        const users = await User.find();
        for (let user of users) {
            if (await user.comparePassword(password)) {
                if (!user.status) {
                    return ctx.reply(
                        adminMessage.userNotActive,
                        {
                            parse_mode: "Markdown",
                            reply_markup: adminMenuKeyboard
                        }
                    );
                }
                ctx.session.waitingUpdateUserWalletPk = true;
                ctx.session.waitingUpdateUserWalletUser = user.telegramId;
                logger.info(`Valid user, taking wallet to update`)
                return ctx.reply(
                    adminMessage.adminUpdateUserWallet,
                    {
                        parse_mode: "Markdown",
                        reply_markup: backKeyboard
                    }
                );
            }
        }
        return ctx.reply(adminMessage.userNotFound, {
            parse_mode: "Markdown",
            reply_markup: adminMenuKeyboard
        }
        );
    } catch (error) {
        console.log(error)
        ctx.session.waitingUpdateUserWallet = false;
        logger.info(`Error while updating user wallet `)
        logger.info(error)
    }

}


async function updateUserWalletPk(ctx) {
    try {
        const userMessage = ctx.message.text.trim();
        const userId = ctx.session.waitingUpdateUserWalletUser;
        try {
            Keypair.fromSecretKey(bs58.default.decode(userMessage));
        } catch (err) {
            return ctx.reply(adminMessage.invaildPrivateKey, {
                parse_mode: "Markdown",
                reply_markup: backKeyboard
            });
        }

        await User.findOneAndUpdate(
            { telegramId: userId },
            { privateKey: userMessage },
            { upsert: true, new: true }
        );
        logger.info(`User wallet changed tid : ${userId}`)
        return ctx.reply(
            `✅ *User wallet updated!*\n\n`,
            {
                parse_mode: "Markdown",
                reply_markup: adminMenuKeyboard
            }
        );
    } catch (error) {
        logger.info(`Error while updating wallet`)
        logger.info(error)
    }

}
async function getUserWallets(ctx, page = 1, perPage = 5) {
    try {
        const telegramId = ctx.from.id;
        const user = await User.findOne({ telegramId });
        let message = '👆 Tap a wallet to activate it';

        if (!user) {
            logger.warn(`User not found for telegram id ${telegramId}`);
            return {
                message: adminMessage.userNotFound,
                keyboard: Markup.inlineKeyboard([
                    [
                        Markup.button.callback("🔙 Back", "user_back"),
                        Markup.button.callback("🚀 Add Wallet", "add_wallet")
                    ]
                ]).reply_markup
            };
        }

        const totalWallets = await Wallet.countDocuments({ user_id: user._id });
        const totalPages = Math.ceil(totalWallets / perPage);
        if (page > totalPages) page = totalPages;

        page = Math.max(1, page);

        const wallets = await Wallet.find({ user_id: user._id })
            .skip(((page - 1)) * perPage)
            .limit(perPage)
            .lean();

        if (!wallets || wallets.length === 0) {
            logger.info(`User does not have any wallet`);
            return {
                message: adminMessage.walletNotLinked,
                keyboard: Markup.inlineKeyboard([
                    [
                        Markup.button.callback("🔙 Back", "user_back"),
                        Markup.button.callback("🚀 Add Wallet", "add_wallet")
                    ]
                ]).reply_markup
            };
        }

        const walletButtons = wallets.map(wallet => {
            const isActive = wallet.status ? '✅' : '';
            return [Markup.button.callback(`${wallet.label} ${isActive}`, `activeWallet_${wallet._id}`)];
        });

        const navigationButtons = [];

        if (page > 1) {
            navigationButtons.push(Markup.button.callback("⬅️ Prev", `wallets_page_${page - 1}`));
        }

        navigationButtons.push(Markup.button.callback(`📄 ${page}/${totalPages}`, "noop"));

        if (page < totalPages) {
            navigationButtons.push(Markup.button.callback("➡️ Next", `wallets_page_${page + 1}`));
        }

        walletButtons.push([
            Markup.button.callback("🔙 Back", "user_back"),
            Markup.button.callback("🚀 Add Wallet", "add_wallet"),
            ...navigationButtons
        ]);

        return {
            message,
            keyboard: Markup.inlineKeyboard(walletButtons).reply_markup
        };

    } catch (error) {
        logger.error(`Get user wallet error: ${error}`);
        return ctx.reply("🛑 Error while getting user wallets.");
    }
}

async function getWalletNameAddPKey(ctx) {
    try {
        const telegramId = ctx.from.id;
        const user = await User.findOne({ telegramId });
        const userMessage = ctx.message.text.trim();

        // Validate Private Key
        try {
            Keypair.fromSecretKey(bs58.default.decode(userMessage));
        } catch (err) {
            console.log('errerr', err)
            logger.info(err)

            return ctx.reply(adminMessage.invaildPrivateKey, {
                parse_mode: "Markdown",
                reply_markup: await getUserKeyboard(ctx)
            });
        }

        // Check for duplicate wallet
        const userWallets = await Wallet.find({ user_id: user._id });
        const isDuplicateWallet = userWallets.some(wallet => wallet.privateKey === userMessage);
        const newWallet = {
            user_id: user._id,
            privateKey: userMessage,
            label: ctx.session.walletLabel
        }
        if (isDuplicateWallet) {
            return ctx.reply(adminMessage.walletExist, {
                parse_mode: "Markdown",
                reply_markup: await getUserKeyboard(ctx)
            });
        }

        if (userWallets.length === 0) {
            newWallet.status = true;
        }

        await Wallet.create(newWallet);

        logger.info(`Wallet added for user ${user._id}`);

        return ctx.reply(adminMessage.walletAdded, {
            parse_mode: "Markdown",
            reply_markup: await getUserKeyboard(ctx)
        })
    } catch (erorr) {
        logger.info(`error while setting private key`)
        logger.info(JSON.stringify(error))
    }
}
async function getWalletNameAdd(ctx) {
    try {
        const telegramId = ctx.from.id;
        const walletLabel = ctx.message.text.trim();
        const user = await User.findOne({ telegramId });

        if (!user) {
            logger.warn(`User not found for telegram id ${telegramId}`);
            return {
                message: adminMessage.userNotFound,
                keyboard: Markup.inlineKeyboard([
                    [Markup.button.callback("🔙 Back", "user_back")],
                ]).reply_markup
            };
        }

        ctx.session.walletLabel = walletLabel;
        ctx.session.waitingWalletPKey = true;
        ctx.session.waitingWalletAdd = false;

        return ctx.reply(adminMessage.setupWallet, {
            parse_mode: "Markdown",
            reply_markup: backKeyboard
        });

    } catch (error) {
        logger.error(`Error while adding wallet: ${JSON.stringify(error)}`);
        return ctx.reply("❌ Failed to add wallet.");
    }
}

async function toggleUserActiveWallet(walletId, ctx) {
    try {
        const telegramId = ctx.from.id;
        const user = await User.findOne({ telegramId });

        if (!user) {
            logger.warn(`User not found for telegram id ${telegramId}`);
            return ctx.reply(adminMessage.userNotFound, {
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback("🔙 Back", "user_back")]
                ])
            });
        }

        await Wallet.updateMany({ user_id: user._id }, { status: false });

        const updated = await Wallet.findOneAndUpdate(
            { _id: walletId },
            { status: true },
            { new: true }
        );

        if (!updated) {
            logger.warn(`Wallet not found or doesn't belong to user`);
            return ctx.reply("❌ Wallet not found or not associated with your account.");
        }

        logger.info(`✅ Active wallet updated to ${updated.label} (${updated._id}) for user ${user._id}`);

        return ctx.reply(
            `✅ Wallet *${updated.label}* is now active.`,
            {
                parse_mode: "Markdown",
                reply_markup: await getUserKeyboard(ctx)
            }
        );

    } catch (error) {
        logger.error(`❌ Error in toggleUserActiveWallet: ${error}`);
        return ctx.reply("⚠️ An error occurred while updating your active wallet. Please try again later.");
    }
}

module.exports = {
    addUser,
    removeUser,
    viewUser,
    verifyPassword,
    checkUserRegitered,
    setupWallet,
    checkWalletSetup,
    getBuyAmount,
    getSlippage,
    getUserDetails,
    isNotificationEnabled,
    updateNotificationPreference,
    getStopLoss,
    getTakeProfit,
    tokenForceSell,
    updateTradeToggle,
    updateUserWallet,
    updateUserWalletPk,
    getUserWallets,
    getWalletNameAdd,
    getWalletNameAddPKey,
    toggleUserActiveWallet
};
