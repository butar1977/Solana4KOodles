require('dotenv').config();
const axios = require('axios');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const { Keypair } = require('@solana/web3.js');

// Load environment variables
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
const RUGCHECK_API_URL = process.env.RUGCHECK_API_URL || "https://api.rugcheck.xyz/v1/auth/login/solana";

if (!SOLANA_PRIVATE_KEY) {
    console.error("Missing SOLANA_PRIVATE_KEY in .env");
    process.exit(1);
}

// Decode Base58 private key
const secretKey = bs58.decode(SOLANA_PRIVATE_KEY);
const keypair = Keypair.fromSecretKey(secretKey);

async function getRugCheckAuthToken() {
    const publicKey = keypair.publicKey.toBase58();
    const message = `Authenticate with RugCheck - ${Date.now()}`;
    const messageBytes = Buffer.from(message);

    // Sign message using NaCl
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

    const payload = {
        message: {
            message,
            publicKey,
            timestamp: Date.now()
        },
        signature: {
            data: Array.from(signature),
            type: "Buffer"
        },
        wallet: publicKey
    };

    try {
        const response = await axios.post(RUGCHECK_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return response.data.token;
    } catch (error) {
        console.error('Error getting auth token:', error.response?.data || error.message);
    }
}

// Run function
getRugCheckAuthToken();
