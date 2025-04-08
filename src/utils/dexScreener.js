const axios = require('axios');
const { DEXSCREENER_API } = process.env;

async function getPairDetails(tokenAddress) {
    try {
        const { data } = await axios.get(`${DEXSCREENER_API}/latest/dex/tokens/${tokenAddress}`);
        if (!data || !data?.pairs) return null;

        let solanaPair = null;
        let usdcPair = null;

        if (data.pairs.length === 1) {
            solanaPair = data.pairs[0];
        } else {
            data.pairs.forEach(pair => {
                if (pair.quoteToken.symbol === 'SOL' && pair?.quoteToken?.name === 'Wrapped SOL' && pair.dexId == 'pumpswap') {
                    solanaPair = pair;
                }
            });
        }

        return {
            tokenDataVolumeSOL: solanaPair ? solanaPair.volume : { h24: 0, h6: 0, h1: 0, m5: 0 },
            tokenDataVolumeUSDC: usdcPair ? usdcPair.volume : { h24: 0, h6: 0, h1: 0, m5: 0 },
            tokenVolume:
                (solanaPair?.volume?.h24 || 0) +
                (usdcPair?.volume?.h24 || 0),
            priceChange: solanaPair?.priceChange || usdcPair?.priceChange || { h1: 0, h6: 0, h24: 0 },
            liquidity: solanaPair?.liquidity || usdcPair?.liquidity || { usd: 0, base: 0, quote: 0 },
            fdv: solanaPair?.fdv || usdcPair?.fdv || 0,
            marketCap: solanaPair?.marketCap || usdcPair?.marketCap || 0,
            pairCreatedAt: solanaPair?.pairCreatedAt || usdcPair?.pairCreatedAt || null
        };

    } catch (error) {
        console.error('❌ Error fetching token details:', error);
        return null;
    }
}

module.exports = { getPairDetails };
