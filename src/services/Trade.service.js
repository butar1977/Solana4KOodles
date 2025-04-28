const Trade = require("../models/Trade");
const JupiterService = require("./jupiter.service");
const NotificationService = require("./notification.service");
const { sanitizeMessage, getStartOfDay, getEndOfDay, getDateRanges } = require("../utils/telegramBot");
const User = require("../models/User");
const { getFilteredTokens, getRiskLevel } = require("./token.service");
const { TradeQueue } = require("../queue");
const { getUserHoldings, getUserPublicKey } = require("../utils/solanaHelper");
const logger = require("../utils/logger");
const { bot } = require("./telegram.service");
const TokenPrice = require("../models/TokenPrice");
const TokenVerification = require("../models/TokenVerification");
const jupiterService = require("./jupiter.service");
const Token = require('../models/token');
const Wallet = require("../models/Wallet");
class TradeService {

    async executeTrade({ userId, userPublicKey, userPrivateKey, token, amount, tradeType, riskLevel, slippage, stopLoss,
        takeProfit, realizedPnL, decimals, tokenPriceAtSell, msg }) {
        const inputMint = tradeType === "buy" ? "So11111111111111111111111111111111111111112" : token;
        const outputMint = tradeType === "buy" ? token : "So11111111111111111111111111111111111111112";

        try {
            // Fetch Quote
            logger.info(`userId, userPublicKeyz, token, amount, tradeType, riskLevel, slippage, stopLoss,takeProfit',realizedPnL, decimals ${userId}, ${userPublicKey},  ${token}, ${amount}, ${tradeType}, ${riskLevel}, ${slippage}, ${stopLoss},
                ${takeProfit} ${realizedPnL}, ${decimals} ${tokenPriceAtSell}`);

            const quote = await JupiterService.getQuote(inputMint, outputMint, amount, slippage);
            if (!quote.success) {
                logger.info(`quote?.errorquote?.error s ${JSON.stringify(quote?.error)}`)
                return await this.handleFailedTrade(userId, token, amount, tradeType, riskLevel, sanitizeMessage(quote?.error) || "Failed to fetch quote.");
            }

            // Create Swap Transaction'
            logger.info(`quote?.dataquote?.data', ${JSON.stringify(quote?.data)}`)
            const swapResponse = await JupiterService.getSwapTransaction(userPublicKey, quote?.data);
            if (!swapResponse.success) {
                return await this.handleFailedTrade(userId, token, amount, tradeType, riskLevel, sanitizeMessage(swapResponse?.error) || "Failed to create swap transaction.");
            }

            console.log('quote?.data?.routePlan?.swapInfo', quote?.data?.routePlan[0]?.swapInfo)
            const { inAmount, outAmount, feeAmount } = quote?.data?.routePlan[0]?.swapInfo;
            logger.info(`swapResponseswapResponse, ${JSON.stringify(swapResponse?.data)}`)

            console.log('inAmount, outAmount, feeAmount', inAmount, outAmount, feeAmount)
            if (swapResponse?.data.simulationError) {
                return await this.handleFailedTrade(userId, token, amount, tradeType, riskLevel, sanitizeMessage(swapResponse?.data?.simulationError?.error) ?? "Failed to create swap transaction.");
            }
            // Execute Swap Transaction
            const signature = await JupiterService.sendTxnToNetwork(userPrivateKey, swapResponse?.data);
            if (!signature) {
                return await this.handleFailedTrade(userId, token, amount, tradeType, riskLevel, "Transaction failed.");
            }

            let tokenPriceAtPurchase = 0

            try {
                const priceEntry = await TokenPrice.findOne({
                    token: token,
                    date: { $lte: new Date(Date.now() - 60 * 1000) },
                })
                    .sort({ date: -1 })
                    .lean()
                    .select("price");
                tokenPriceAtPurchase = priceEntry?.price ?? 0;
            } catch (erorr) {
                tokenPriceAtPurchase = await JupiterService.getTokenPrice(token);
            } finally {
                if (tokenPriceAtPurchase == 0) {
                    tokenPriceAtPurchase = await JupiterService.getTokenPrice(token);
                }
            }
            // Store Successful Trade
            const trade = await Trade.create({
                userId,
                token,
                amount,
                tradeType,
                riskLevel,
                status: "pending",
                executionTime: new Date(),
                signature,
                tokenPriceAtPurchase,
                stopLoss,
                takeProfit,
                realizedProfit: realizedPnL,
                decimals,
                inAmount: Number(inAmount),
                outAmount: Number(outAmount),
                feeAmount: Number(feeAmount),
                tokenPriceAtSell,
                slippage,
                msg
            });

            logger.info(`Txn ${token} | ${userId} |  ${amount} | ${tradeType} | Pending`)


            await this.checkTxn({ signature, userId, token }, tradeType);
            return { success: true, trade };

        } catch (error) {
            console.error("Trade execution error:", error);
            return await this.handleFailedTrade(userId, token, amount, tradeType, riskLevel, error.message);
        }
    }

    async getUserTradeStatus(userId, last4TxnFailed) {
        return false;
    }
    // Handle Failed Trades - Saves to DB & Notifies User
    async handleFailedTrade(userId, token, amount, tradeType, riskLevel, failureReason) {
        const trade = await Trade.create({
            userId,
            token,
            amount,
            tradeType,
            riskLevel,
            status: "failed",
            failureReason,
            executionTime: new Date()
        });

        const isLastTxnFail = await this.getUserTradeStatus(userId, false);
        if (isLastTxnFail) {
            logger.info(`Unable to perform ${tradeType}.User have multiple failed txn. Disabling trade for userId: ${userId}`)
            await NotificationService.disabledTradingUserAc(userId);
        }

        return { success: false, trade };
    }


    async processTokenTradesForUsers() {
        const users = await User.find({
            status: true,
            privateKey: { $exists: true, $ne: "" },
            buyAmount: { $gt: 0 }
        });
        const tokens = await getFilteredTokens();
        for (const user of users) {
            if (!user.tradeEnabled) {
                logger.info(`User disabled trade ${user._id}`)
            } else {
                for (const token of tokens) {
                    const tokenAddress = token.tokenAddress;
                    const tk = await TokenVerification.findOne({ mint: tokenAddress })

                    const risk = await getRiskLevel(tk.score_normalised);
                    logger.info(`Risk for ${tokenAddress} ${risk.label}`)
                    const alreadyTraded = await Trade.findOne({
                        userId: user._id,
                        token: tokenAddress,
                        tradeType: "buy",
                        status: { $ne: "failed" } // Ignore failed trades
                    });

                    if (!alreadyTraded) {
                        logger.info(`🛒 Enqueuing buy trade for ${user._id} - ${tokenAddress}`);
                        await TradeQueue.add("buy", {
                            userId: user._id,
                            token: tokenAddress,
                            riskLevel: risk.label,
                            decimals: 9
                        });
                    }
                }
            }

        }
    }

    async triggerSaleCheck(holding, purchasePrice, amountToSell, user, trade, decimals) {
        let currentPrice = 0;
        const { takeProfit, stopLoss } = user;

        try {

            const priceEntry = await TokenPrice.findOne({
                token: holding.tokenAddress,
                date: { $lte: new Date(Date.now() - 60 * 1000) },
            })
                .sort({ date: -1 })
                .lean()
                .select("price");

            currentPrice = priceEntry?.price ?? 0;
        } catch (erorr) {
            currentPrice = await JupiterService.getTokenPrice(holding.tokenAddress);
        } finally {
            if (currentPrice == 0) {
                currentPrice = await JupiterService.getTokenPrice(holding.tokenAddress);
            }
        }

        const priceChange = ((currentPrice - purchasePrice) / purchasePrice) * 100;
        logger.info(`[${holding.tokenAddress}] const priceChange = ((${currentPrice} - ${purchasePrice}) / ${purchasePrice}) * 100;`)
        const shouldSell =
            priceChange >= takeProfit ||
            priceChange <= -stopLoss;

        logger.info(`${priceChange} >= ${takeProfit} ||
                ${priceChange} <= -${stopLoss};`)

        if (shouldSell) {
            const realizedPnL = (currentPrice - purchasePrice) * (amountToSell / (10 ** decimals));

            const reason = priceChange >= takeProfit
                ? 'Take Profit (TP) hit'
                : 'Stop Loss (SL) triggered';

            logger.info(`📤 Enqueuing SELL for ${user._id} - ${holding.tokenAddress} (Price Change: ${priceChange.toFixed(2)}% tokenPriceAtSell: ${currentPrice})`);

            await TradeQueue.add("sell", {
                userId: user._id,
                token: holding.tokenAddress,
                amount: (amountToSell).toFixed(0),
                riskLevel: trade.riskLevel,
                realizedPnL,
                decimals,
                tokenPriceAtSell: currentPrice,
                msg: `Sale was triggered due to: ${reason}. Price Change: ${priceChange.toFixed(2)}%`
            }, { delay: 10000 });
        }
    }

    async processTokenSellsForUsers() {
        const users = await User.find({ status: true, tradeEnabled: true });
        for (const user of users) {
            const activeWallet = await Wallet.findOne({ user_id: user._id, status: true });
            if (!activeWallet) {
                logger.info(`[Sell] No active wallet found for user: ${user._id}`);
                continue;
            }
            const walletAddress = await getUserPublicKey(activeWallet.privateKey);
            const userHoldings = await getUserHoldings(walletAddress);
            console.log('userHoldingsuserHoldings', userHoldings)
            // logger.info(`User holding count ${user._id} ${userHoldings.length}`)

            for (const holding of userHoldings) {
                if (holding.balance <= 0) {
                    logger.info(`holding.balance ${holding.tokenAddress} is less than 0>${holding.balance} `)
                    continue;
                }
                const trade = await Trade.findOne({
                    userId: user._id,
                    token: holding.tokenAddress,
                    tradeType: "buy",
                    status: "success"
                });

                if (!trade) {
                    logger.info(`Not found trade for ${holding.tokenAddress} ${holding.balance} `)
                    continue
                };
                const { outAmount } = trade;
                const { decimals } = holding;
                let amountToSell = outAmount;
                const amtAtPurchase = (outAmount / (10 ** decimals));
                if (amtAtPurchase > holding.balance) {
                    logger.info(`Actual holding and purcashe amt diff ${holding.tokenAddress} : ${amtAtPurchase} | ${holding.balance}`)
                    amountToSell = holding.balance * (10 ** decimals);
                }
                const purchasePrice = trade.tokenPriceAtPurchase;
                await this.triggerSaleCheck(holding, purchasePrice, amountToSell, user, trade, decimals);
            }
        }
    }

    async getTxnStatus(tradeType) {
        try {
            // Fetch only pending buy trades
            const trades = await Trade.find({
                tradeType,
                status: "pending"
            });

            for (const trade of trades) {
                await this.checkTxn(trade, tradeType);
            }

        } catch (error) {
            console.error("Error in getTxnStatus:", error);
        }
    }

    async checkTxn(trade, tradeType) {
        const { signature, userId, token } = trade;
        let res;
        let attempts = 0;
        let maxAttempts = 30; // Retry up to 5 times
        let newStatus = "failed";
        let message = `❌ Your trade for ${token} has failed.\n🔗 [View Transaction](https://solscan.io/tx/${signature}`;

        while (attempts < maxAttempts) {
            try {
                res = await JupiterService.getTxnStatus(signature);

                // Retry if response is null (transaction still pending)
                if (!res) {
                    logger.info(`🔄 Retrying... Txn ${signature} not found.`);
                    await NotificationService.delay(1 * 1000); // Wait 5s before retrying
                    attempts++;
                    continue;
                }

                // If the transaction failed
                logger.info(`❌ Transaction failed❌ Transaction failed  ${JSON.stringify(res.meta)}`)
                logger.info(`${signature} signaturesignature`);
                if (res.meta?.err != null) {
                    logger.info(`❌ Transaction failed: ${signature}`);
                    logger.info(res.meta.err)
                    break;
                }

                // Transaction success
                newStatus = "success";
                message = `✅ Your trade for ${token} was successful!\nTxn Hash: ${signature}`;
                logger.info(`✅ Transaction successful: ${signature}`);
                break;

            } catch (rpcError) {
                console.error(`⚠️ RPC Error for ${signature}:`, rpcError.message);
                await NotificationService.delay(1 * 1000);
                attempts++;
            }
        }

        // Update the trade status
        const updatedTrade = await Trade.findOneAndUpdate(
            { userId, token, tradeType, status: "pending" },
            { $set: { status: newStatus } },
            { new: true }
        );
        if (newStatus === "success") {
            await User.findOneAndUpdate(
                { _id: userId },
                { last4TxnFailed: false }
            )
        }

        await NotificationService.sendTradeNotification(userId, updatedTrade, newStatus, message);
    }
    async calculateUnrealizedPnL(filter, ctx, startDate, endDate) {
        delete filter.tradeType;
        console.log('filter:', filter);

        const holdings = await Trade.find({ ...filter, tradeType: "buy" });

        if (holdings.length === 0) {
            return 0;
        }
        console.log('holdingsholdings', holdings)

        let totalUnrealizedPnL = 0;
        const totalHoldings = holdings.length;
        const tokens = [...new Set(holdings.map(h => h.token))];
        console.log('tokenstokenstokens', tokens)

        const priceMap = {};
        for (const token of tokens) {
            const priceEntry = await TokenPrice.findOne({
                token,
                date: { $lte: endDate }
            })
                .sort({ date: -1 })
                .lean()
                .select("price");
            console.log('priceEntry', priceEntry)

            priceMap[token] = priceEntry ? priceEntry.price : 0;
        }
        console.log('priceMappriceMappriceMap', JSON.stringify(priceMap))

        let lastMessage = await ctx.reply(`Checking prices for ${totalHoldings} holdings...`);
        let lastMessageId = lastMessage.message_id;

        let checkedCount = 0;
        for (const holding of holdings) {
            try {
                if (checkedCount % 5 === 0) {
                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        lastMessageId,
                        `Checking price for ${holding.token} (${checkedCount + 1}/${totalHoldings})...`
                    );
                }

                const tokenDecimal = await TokenVerification.findOne({
                    mint: holding.token
                })
                const decimal = tokenDecimal.token.decimals ?? 0;

                let currentPrice = priceMap[holding.token] || 0;
                if (currentPrice == 0) {
                    currentPrice = await jupiterService.getTokenPrice(holding.token);
                }
                logger.info(`(currentPrice) * (holding.outAmount / (10 ** decimal))- (holding.outAmount / (10 ** decimal)) * holding.tokenPriceAtPurchase; \n(${currentPrice}) * (${holding.outAmount} / (10 ** decimal))
                    - (${holding.outAmount} / (10 ** ${decimal})) * ${holding.tokenPriceAtPurchase};`)

                holding.unrealizedProfit = (currentPrice) * (holding.outAmount / (10 ** decimal))
                    - (holding.outAmount / (10 ** decimal)) * holding.tokenPriceAtPurchase;
                logger.info('holding.unrealizedProfit', holding.unrealizedProfit)
                totalUnrealizedPnL += holding.unrealizedProfit;
                checkedCount++;
            } catch (error) {
                console.error("Failed to edit message:", error);
            }
        }

        await ctx.api.editMessageText(
            ctx.chat.id,
            lastMessageId,
            `Finished checking prices. Wating for PnL`
        );

        return totalUnrealizedPnL;
    }

    async sendEODPnLReport(ctx, action, startDatePnL = null, endDatePnL = null) {
        console.log('action,startDatePnL,endDatePnL', action, startDatePnL, endDatePnL)
        const { startDate, endDate } = getDateRanges(action, startDatePnL, endDatePnL);
        const { id } = ctx.from;
        const user = await User.findOne({ telegramId: id });
        if (!user) {
            logger.info(`No user find with this telegram id`)
        }
        const filter = {
            userId: user._id,
            status: "success",
            tradeType: "sell",
            executionTime: { $gte: startDate, $lt: endDate }
        };
        console.log('filter', filter)
        const trades = await Trade.find(filter);

        const totalRealizedPnL = trades.reduce((sum, trade) => sum + trade.realizedProfit, 0);
        const totalUnrealizedPnL = await this.calculateUnrealizedPnL(filter, ctx, startDate, endDate);
        console.log('totalUnrealizedPnLtotalUnrealizedPnLtotalUnrealizedPnL', totalUnrealizedPnL)

        if (totalRealizedPnL !== 0 || totalUnrealizedPnL !== 0) {
            const message = `📊 *Daily PnL Report* 📊\n\nUser: ${user.username || user.telegramId}\n` +
                `💰 *Realized PnL:* ${totalRealizedPnL.toFixed(4)} USDT\n` +
                `📈 *Unrealized PnL:* ${totalUnrealizedPnL.toFixed(4)} USDT\n\n` +
                `🔹 Realized PnL: Closed trades profit/loss\n🔹 Unrealized PnL: Open positions value change`;

            return bot.api.sendMessage(id, message, { parse_mode: "Markdown" });
        } else {
            return bot.api.sendMessage(id, "📉 No active trades at the moment.", { parse_mode: "Markdown" });
        }
    }

    async buyTokenForAllUsers(token) {
        try {
            const users = await User.find({
                status: true,
                buyAmount: { $gt: 0 },
                tradeEnabled: true
            });
            console.log('usersusers', users)

            if (users.length === 0) {
                logger.info(`No user found for buy token ${token}`)
                return;
            }
            logger.info(`Attempt to buy ${token}`)
            for (const user of users) {
                const activeWallet = await Wallet.findOne({ user_id: user._id, status: true });
                if (!activeWallet) {
                    logger.info(`[Buy] No active wallet found for user: ${user._id}`);
                    continue;
                }
                const tk = await TokenVerification.findOne({ mint: token })
                const risk = await getRiskLevel(tk.score_normalised);
                logger.info(`🛒 Enqueuing buy trade for ${user._id} - ${token}`);
                await TradeQueue.add("buy", {
                    userId: user._id,
                    token,
                    riskLevel: risk.label,
                    decimals: 9
                });
            }
        } catch (error) {
            logger.info(`Error while buy ${token}`)
            logger.info(`error: ${error || error?.message}`)
        }
    }

}

module.exports = new TradeService();
