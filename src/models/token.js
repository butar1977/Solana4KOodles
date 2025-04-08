const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    url: {
        type: String,
    },
    chainId: {
        type: String,
        required: true
    },
    tokenAddress: {
        type: String,
        required: true,
    },
    icon: {
        type: String
    },
    header: {
        type: String
    },
    openGraph: {
        type: String
    },
    description: {
        type: String,
        default: ''
    },
    links: [
        {
            label: {
                type: String,
            },
            url: {
                type: String,
            }
        }
    ],
    tokenDataVolumeSOL: {
        h24: { type: Number, default: 0 },
        h6: { type: Number, default: 0 },
        h1: { type: Number, default: 0 },
        m5: { type: Number, default: 0 }
    },
    tokenDataVolumeUSDC: {
        h24: { type: Number, default: 0 },
        h6: { type: Number, default: 0 },
        h1: { type: Number, default: 0 },
        m5: { type: Number, default: 0 }
    },
    tokenVolume:{ type: Number, default: 0 },
    priceChange: {
        h1: { type: Number, default: 0 },
        h6: { type: Number, default: 0 },
        h24: { type: Number, default: 0 }
    },
    liquidity: {
        usd: { type: Number, default: 0 },
        base: { type: Number, default: 0 },
        quote: { type: Number, default: 0 }
    },
    fdv: { type: Number, default: 0 },
    marketCap: { type: Number, default: 0 },
    pairCreatedAt: { type: Date },
    source: {
        type: String,
        default: 'dexscreener'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Token', tokenSchema);
