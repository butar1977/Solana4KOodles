const { bot } = require("../services/telegram.service");
const RiskLevel = require("../models/RiskLevel");
const User = require("../models/User");
const { Markup } = require("telegraf");
const { backMenu, backKeyboard, replyOrEdit } = require("../utils/telegramBot");
const { NotificationQueue } = require("../queue");
const { sendNotificationAdmin } = require("../services/notification.service");
const adminMessage = require('../utils/handlersMessage');
const { isAdmin, commandHandleAdmin } = require("../middleware/admin.middleware");
const { addUser, removeUser, viewUser, updateUserWallet, updateUserWalletPk } = require("../handlers/user.handler");
const manageUserKeyboard = require("../keyboards/manageUserKeybaord");
const { getSellProfitLoss, setAutoSell } = require("../handlers/setting.handler");
const { handleTextMessageUser, setupHandlersUser } = require("./userActions");
const logger = require("../utils/logger");




// 🟢 Setup Handlers
function setupHandlers(bot) {
    bot.on('callback_query:data', async (ctx) => {
        const action = ctx.callbackQuery.data;
        const isAdminAccess = await commandHandleAdmin(ctx);
        if (isAdminAccess) {
            switch (action) {
                case 'set_risk_level':
                    await handleSetRiskLevel(ctx);
                    break;
                case 'admin_back':
                    await backMenu(ctx, null, isAdminAccess);
                    break;
                case 'manage_users':
                    await manageUser(ctx);
                    break;
                case 'add_user':
                    await addUserHandle(ctx);
                    break;
                case 'remove_user':
                    await handleRemoveUser(ctx);
                    break;
                case 'view_users':
                    await handleViewUser(ctx);
                    break;
                case 'set_auto_sell':
                    await handleSetAutoSell(ctx);
                    break;
                case 'update_user_wallet':
                    await handleUpdateUserWallet(ctx);

                    break;
                default:
                    await handleRiskSelectionUpdate(ctx, action);
                    break;
            }
        } else {
            await setupHandlersUser(ctx);
        }
    });
    bot.on('message', async (ctx) => {
        const action = ctx.message.text;
        if (await commandHandleAdmin(ctx)) {
            await handleTextMessage(ctx, action);
        } else {
            await handleTextMessageUser(ctx, action);
        }
    });
}
async function manageUser(ctx) {
    const replyMarkup = {
        text: adminMessage.mangeUserHeading,
        options: { reply_markup: manageUserKeyboard }
    };

    await replyOrEdit(ctx, replyMarkup);
}
async function addUserHandle(ctx) {
    const replyMarkup = {
        text: `${adminMessage.addUserMsg} to add user`,
        options: { reply_markup: backKeyboard }
    };
    await replyOrEdit(ctx, replyMarkup);
    ctx.session.addUserHandle = true;
}

async function handleRemoveUser(ctx) {
    const replyMarkup = {
        text: `${adminMessage.enterUserWalletMsg} to remove`,
        options: { reply_markup: backKeyboard }
    };
    await replyOrEdit(ctx, replyMarkup);
    ctx.session.removeUserHandle = true;
}

async function handleViewUser(ctx) {
    const replyMarkup = {
        text: `${adminMessage.enterUserWalletMsg} to view`,
        options: { reply_markup: backKeyboard }
    };
    await replyOrEdit(ctx, replyMarkup);
    ctx.session.viewUserHandle = true;
}

async function handleSetAutoSell(ctx) {
    try {
        const sellProfit = await getSellProfitLoss();
        const profitText = sellProfit?.autoSell_profit ? `${sellProfit.autoSell_profit}%` : "Not Set";
        const stopLossText = sellProfit?.autoSell_stopLoss ? `${sellProfit.autoSell_stopLoss}%` : "Not Set";

        const text = `📌 *Set Auto-Sell Strategy*\n\n` +
            `💰 Sell Profit: *${profitText}*\n` +
            `🔻 Stop Loss: *${stopLossText}*\n\n` +
            `📝 *Copy & Use:*\n\`/set_auto_sell profit=${sellProfit?.autoSell_profit ?? 'X'} stop_loss=${sellProfit?.autoSell_stopLoss ?? 'Y'}\`\n\n` +
            `📋 *How to Update Auto-Sell Strategys:*\n` +
            `1️⃣ Click on the command above ☝️\n` +
            `2️⃣ Paste it in the chat and update values\n` +
            `3️⃣ Press "Send" ✅`;

        await replyOrEdit(ctx, { text, options: { parse_mode: "Markdown", reply_markup: backKeyboard } });
        ctx.session.waitingSetAutoSell = true;
    } catch (error) {
        console.error("Error in handleSetAutoSell:", error);
    }
}

async function handleUpdateUserWallet(ctx) {
    try {
        const replyMarkup = {
            text: `${adminMessage.enterUserWalletMsg} to update wallet`,
            options: { reply_markup: backKeyboard }
        };
        await replyOrEdit(ctx, replyMarkup);
        ctx.session.waitingUpdateUserWallet = true;
    } catch (error) {
        logger.info(`Error while update user wallet`)
        logger.info(error)
    }
}
// ahandleSetAutoSell

async function handleTextMessage(ctx, action) {
    logger.info(`ctx.session.action', ${action}`);

    if (ctx.session.waitingRiskUpdate) {
        await handleRiskSelectionUpdate(ctx, action);
    } else if (ctx.session.addUserHandle) {
        await addUser(ctx);
    } else if (ctx.session.removeUserHandle) {
        await removeUser(ctx);
    } else if (ctx.session.viewUserHandle) {
        await viewUser(ctx);
    } else if (ctx.session.waitingSetAutoSell) {
        await setAutoSell(ctx)
    }else if(ctx.session.waitingUpdateUserWallet){
        await updateUserWallet(ctx);
    }else if(ctx.session.waitingUpdateUserWalletPk){
        await updateUserWalletPk(ctx);
    }
}

async function handleRiskSelectionUpdate(ctx, callbackData) {
    logger.info(`Received callback data:  ${callbackData}`);

    if (!/^risk_(low|moderate|high|super)_\d+_\d+$/.test(callbackData)) {
        return ctx.reply("Invalid risk selection format.");
    }

    const [_, selectedRisk, min, max] = callbackData.split("_").map(val => isNaN(val) ? val.replace("_", " ") : Number(val));//NOSONAR

    // ✅ Validation: Ensure min and max are within range
    if (min < 0 || max > 100 || min > max) {
        return ctx.reply("❌ Invalid range. Min must be ≥ 0, Max must be ≤ 100, and Min cannot be greater than Max.");
    }

    try {
        logger.info(`Selected Risk: ${selectedRisk}, Min: ${min}, Max: ${max}`);

        let riskLevels = await RiskLevel.find({}).sort({ min: 1 });

        let currentIndex = riskLevels.findIndex(risk => new RegExp(`^${selectedRisk} risk$`, "i").test(risk.label));

        if (currentIndex === -1) {
            return ctx.reply("❌ Risk level not found.");
        }

        riskLevels[currentIndex].min = min;
        riskLevels[currentIndex].max = max;

        // Adjust the next risk level's min
        if (currentIndex < riskLevels.length - 1) {
            let nextRisk = riskLevels[currentIndex + 1];
            if (max + 1 > nextRisk.max) {
                return ctx.reply(`❌ Conflict: Max (${max}) overlaps with the next risk level "${nextRisk.label}" (${nextRisk.min}-${nextRisk.max}).`);
            }
            nextRisk.min = max + 1;
        }

        // Adjust the previous risk level's max
        if (currentIndex > 0) {
            let prevRisk = riskLevels[currentIndex - 1];
            if (min - 1 < prevRisk.min) {
                return ctx.reply(`❌ Conflict: Min (${min}) overlaps with the previous risk level "${prevRisk.label}" (${prevRisk.min}-${prevRisk.max}).`);
            }
            prevRisk.max = min - 1;
        }

        await Promise.all(riskLevels.map(risk =>
            RiskLevel.updateOne(
                { label: { $regex: `^${risk.label}$`, $options: "i" } },
                { min: risk.min, max: risk.max }
            )
        ));

        sendNotificationAdmin({ selectedRisk, min, max, ctx });
        await backMenu(ctx, '✅ Risk levels updated successfully.', true);

    } catch (error) {
        console.error("Error updating risk levels:", error);
        await ctx.reply("❌ Failed to update risk levels.");
    }
}


async function handleSetRiskLevel(ctx) {
    try {
        const riskLevels = await RiskLevel.find({});

        if (!riskLevels.length) {
            return ctx.reply("❌ No risk levels found in the database.");
        }

        let replyText = "⚠ *Select a Risk Level:*\n\n";

        riskLevels.map(level => {
            const command = `risk_${level.label.toLowerCase().replace(/\s+/g, '_').replace(/_?risk_?/, '')}_${level.min}_${level.max}`;
            replyText += `👉 ${level.label} (${level.min}-${level.max}) | \`${command}\`\n`;
            return [Markup.button.callback(`${level.label} (${level.min}-${level.max})`, command)];
        });

        // Append instructions
        replyText += `\n📋 *How to Update Risk Level:*\n` +
            `1️⃣ Click on a command next to risk level\n` +
            `2️⃣ Paste it in the chat and update risk limit\n` +
            `3️⃣ Press "Send" ✅\n\n`;

        await ctx.reply(replyText, {
            parse_mode: "Markdown",
            reply_markup: backKeyboard
        });
        ctx.session.waitingRiskUpdate = true;
    } catch (error) {
        console.error("Error fetching risk levels:", error);
        await ctx.reply("❌ Failed to fetch risk levels.");
    }
}
module.exports = setupHandlers;


