const mongoose = require("mongoose");

const HolderSchema = new mongoose.Schema({
    address: String,
    amount: Number,
    decimals: Number,
    pct: Number,
    uiAmount: Number,
    uiAmountString: String,
    owner: String,
    insider: Boolean
});

const RiskSchema = new mongoose.Schema({
    name: String,
    value: String,
    description: String,
    score: Number,
    level: String
});

const LockerSchema = new mongoose.Schema({
    programID: String,
    tokenAccount: String,
    owner: String,
    uri: String,
    unlockDate: Number,
    usdcLocked: Number,
    type: String
});

const MarketSchema = new mongoose.Schema({
    pubkey: String,
    marketType: String,
    mintA: String,
    mintB: String,
    mintLP: String,
    liquidityA: String,
    liquidityB: String,
    lp: Object
});

const EventSchema = new mongoose.Schema({
    event: Number,
    oldValue: String,
    newValue: String,
    createdAt: Date
});

const InsiderNetworkSchema = new mongoose.Schema({
    id: String,
    size: Number,
    type: String,
    tokenAmount: Number,
    activeAccounts: Number
});

const TokenVerificaionSchema = new mongoose.Schema({
    mint: String,
    tokenProgram: String,
    creator: String,
    token: Object,
    token_extensions: Object,
    tokenMeta: Object,
    topHolders: [HolderSchema],
    freezeAuthority: String,
    mintAuthority: String,
    risks: [RiskSchema],
    score: Number,
    score_normalised: Number,
    fileMeta: Object,
    lockerOwners: Object,
    lockers: Object,
    markets: [MarketSchema],
    totalMarketLiquidity: Number,
    totalLPProviders: Number,
    totalHolders: Number,
    price: Number,
    rugged: Boolean,
    tokenType: String,
    transferFee: Object,
    knownAccounts: Object,
    events: [EventSchema],
    verification: Object,
    graphInsidersDetected: Number,
    insiderNetworks: [InsiderNetworkSchema],
    detectedAt: Date,
    creatorTokens: Object,
    tokenVolume: { type: Number, default: 0 },
    token_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Token'
    },
    percentageHolderTop10: {
        type: Number,
        default: 0
    }

});

module.exports = mongoose.model("TokenVerificaion", TokenVerificaionSchema);
