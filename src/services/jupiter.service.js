const { VersionedTransaction, Connection, Keypair } = require("@solana/web3.js");
const axios = require("axios");
const bs58 = require("bs58");
const logger = require("../utils/logger");
const { JUPITER_API_BASE, SOLANA_RPC_URL, RUGCHECK_API_URL } = process.env;
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

let lastRequestTime = 0;
const RATE_LIMIT_INTERVAL = 1000; // 1 second delay between requests (adjust based on your rate limit)

class JupiterService {
    async enforceRateLimit() {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastRequestTime;

        if (timeElapsed < RATE_LIMIT_INTERVAL) {
            const waitTime = RATE_LIMIT_INTERVAL - timeElapsed;
            logger.info(`Rate limit hit. Waiting for ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        lastRequestTime = Date.now();
    }

    async getQuote(inputMint, outputMint, amount, slippage = 0.5) {
        try {
            const params = { inputMint, outputMint, amount, slippageBps: slippage * 100 };
            logger.info(`params', ${JSON.stringify(params)}`);
            const response = await axios.get(`${JUPITER_API_BASE}/quote`, { params });
            return { success: true, data: response.data };
        } catch (error) {
            logger.error("Error fetching Jupiter quote:", error.response?.data || error.message);
            return { success: false, error: error.response?.data.error || error.message };
        }
    }

    async getSwapTransaction(userPublicKey, quoteResponse) {
        try {
            const response = await axios.post(`${JUPITER_API_BASE}/swap`, {
                userPublicKey,
                quoteResponse,
                dynamicComputeUnitLimit: true,
                dynamicSlippage: true,
                prioritizationFeeLamports: {
                    priorityLevelWithMaxLamports: { maxLamports: 10000, priorityLevel: "veryHigh" }
                }
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error("Error creating swap transaction:", error.response?.data || error.message);
            return { success: false, error: error.response?.data.error || error.message };
        }
    }

    async sendTxnToNetwork(userPrivateKey, swapResponse) {
        try {
            const transactionBase64 = swapResponse.swapTransaction;
            const transaction = VersionedTransaction.deserialize(Buffer.from(transactionBase64, 'base64'));

            const secretKeyUint8Array = bs58.default.decode(userPrivateKey);
            const userWallet = Keypair.fromSecretKey(secretKeyUint8Array);

            transaction.sign([userWallet]);

            const transactionBinary = transaction.serialize();
            const signature = await connection.sendRawTransaction(transactionBinary, { maxRetries: 2, skipPreflight: true });

            return signature;
        } catch (error) {
            console.error("Error sending transaction:", error);
            return null;
        }
    }

    async getTxnStatus(signature) {
        try {
            const res = await connection.getParsedTransaction(signature, {
                maxSupportedTransactionVersion: 0,  // Explicitly set the max supported version
            });
            return res;
        } catch (error) {
            console.error("Error getTxnStatus:", error);
        }
    }
    async getPriceFromJupiter(token, bulk = false) {
        try {
            const url = `https://api.jup.ag/price/v2?ids=${token}`;
            const response = await axios.get(url);
            if (bulk) {
                logger.info(`Getting token price in bulk | ${token}`)
                logger.info(`Bulk token price, ${JSON.stringify(response?.data?.data)}`);
                return response?.data.data || 0;
            }
            logger.info(`responseresponseresponse, ${response?.data?.data[token]?.price}`);
            return response?.data?.data[token]?.price || 0;
        } catch (err) {
            logger.info(`Error fetching price for ${token}:`, err);
        }
    }

    async getTokenPrice(token, bulk = false) {
        try {
            if (bulk) {
                return await this.getPriceFromJupiter(token, true);
            }
            const url = `${RUGCHECK_API_URL}/v1/tokens/${token}/report`;
            const response = await axios.get(url);
            logger.info(`responseresponseresponse, ${response?.data?.price}`);
            return response?.data?.price || 0;
        } catch (error) {
            logger.info(`Issue while getting price ${error}`)
            return await getPriceFromJupiter(token);
        }
    }
}

module.exports = new JupiterService();
