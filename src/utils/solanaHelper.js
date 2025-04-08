const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { default: axios } = require('axios');
const bs58 = require('bs58');
const logger = require('./logger');
const { SOLANA_RPC_URL } = process.env;
const connection = new Connection(SOLANA_RPC_URL, "confirmed");


async function getUserPublicKey(privateKeyBase58) {
    const privateKeyUint8Array = bs58.default.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(privateKeyUint8Array);
    return keypair.publicKey.toBase58();
}
async function getUserHoldings(walletAddress) {
    try {
        const response = await axios.post(SOLANA_RPC_URL, {
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
                walletAddress,
                { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
                { encoding: "jsonParsed" }
            ]
        });

        if (!response.data || !response.data.result) {
            throw new Error('Invalid response from Solana RPC');
        }

        const accounts = response.data.result.value;
        const holdings = accounts.map(account => {
            return {
                tokenAddress: account.account.data.parsed.info.mint,
                balance: parseFloat(account.account.data.parsed.info.tokenAmount.uiAmountString),
                decimals: account.account.data.parsed.info.tokenAmount.decimals
            };
        });

        return holdings;
    } catch (error) {
        console.error(`Error fetching holdings for ${walletAddress}:`, error.message);
        return [];
    }
}
async function getUserHoldingsToken(publicKey, tokenAddress) {
    try {
        const ownerPublicKey = new PublicKey(publicKey);
        const mintPublicKey = new PublicKey(tokenAddress);

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
            mint: mintPublicKey
        });

        if (!tokenAccounts.value.length) {
            logger.info(`No token account found for ${tokenAddress}`);
            return { amount: 0 };
        }

        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
        return {
            amount: balance.uiAmount,  // Readable balance
            decimals: balance.decimals
        };
    } catch (error) {
        console.error(`Error fetching holdings for ${publicKey}:`, error);
        return { amount: 0 };
    }
}
module.exports = {
    getUserPublicKey,
    getUserHoldings,
    getUserHoldingsToken
}
