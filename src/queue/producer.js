const axios = require('axios');
const { DEXSCREENER_API } = process.env;

async function fetchNewTokens() {
    try {
        const { data } = await axios.get(`${DEXSCREENER_API}/token-profiles/latest/v1?chainId=solana`);
        return data || []; // ✅ Return tokens to be processed in worker
    } catch (error) {
        console.error('❌ Error fetching tokens:', error);
        return [];
    }
}

module.exports = fetchNewTokens;
