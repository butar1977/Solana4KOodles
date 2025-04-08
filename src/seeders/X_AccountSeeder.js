require('../startup/env');
const mongoose = require("mongoose");
const X_Account = require("../models/X_Accounts"); // Ensure the correct path
const db = require('../startup/db');
const logger = require('../utils/logger');
const usernames = [
    {
        "category": "Solana Official & Ecosystem",
        "users": [
            "Solana", "SolanaFndn", "solana_devs", "aeyakovenko", "rajgokal",
            "SolanaStatus", "SolanaLabs", "SolanaNews", "SolanaCommunity", "SolanaValidator"
        ]
    },
    {
        "category": "Key Influencers & Traders",
        "users": [
            "anndylian", "CryptoMessiah", "zachxbt", "CryptoTony__", "EllioTrades",
            "CryptoKaleo", "Pentosh1", "HsakaTrades", "CryptoDonAlt", "TheCryptoDog",
            "degentony", "Slumpforapump69", "0xfoobar", "brian_armstrong", "cz_binance",
            "inversebrah", "sassal0x", "lucasx_xrp", "mooncarl", "AltcoinGordon",
            "CryptoWizardd", "TraderSZ", "CryptoGemsCom", "CryptoRandy", "MartyBoots",
            "JRNYcrypto", "CryptoBitlord", "ScottLEOWarrior", "CryptoHustle", "CryptoGainz",
            "0xShaun", "DaanCrypto", "CredibleCrypto", "RookieXBT", "CryptoNewton",
            "TraderKoz", "CryptoCapo_", "DonnieBigBags", "CryptoMocho", "TheMoonCarl",
            "Bitboy_Crypto", "CryptoBull", "AltcoinDailyio", "CryptoWhale", "CryptoYoddha",
            "CryptoBusy", "CryptoSniperX", "MisterCryptoX", "CryptoInsightUK"
        ]
    },
    {
        "category": "Meme Coin Specialists & Communities",
        "users": [
            "solana_memes", "MemeCoinHunter", "SolanaSniper", "BonkInu", "DogwifhatSOL",
            "PopcatSOL", "GigachadToken", "FartcoinSOL", "TrumpSOL", "SlerfToken",
            "MichiToken", "MumuTheBull", "BookOfMemeSOL", "CatInADogsWorld", "PenguSOL",
            "PnutToken", "SolamaToken", "SmogToken", "FronkToken", "Moonlana",
            "SolDoge", "SolanaMemeLord", "MemeCoinDegens", "SolanaPumpFun", "MemeTokenRadar",
            "SolanaMoonshots", "CryptoMemeHub", "SolanaMemeKing", "MemeCoinSniper", "SolanaHypeTrain",
            "MemeCoinAlerts", "SolanaDegenClub", "MemeCoinInsider", "SolanaTokenWatch", "MemeCoinGang",
            "SolanaMemeDaily", "TokenSnipeBot", "SolanaMemeRadar", "MemeCoinVibes"
        ]
    },
    {
        "category": "Projects & Platforms",
        "users": [
            "pumpdotfun", "RaydiumProtocol", "JupiterExchange", "Orca_so", "SerumDeFi",
            "Phantom", "SolflareWallet", "BackpackApp", "MagicEden", "StepFinance_",
            "MarinadeFinance", "Saber_HQ", "MangoMarkets", "AldrinExchange", "DriftProtocol",
            "SolendProtocol", "MercurialFi", "PsyOptions", "KatanaFinance", "AuroryProject",
            "StarAtlas", "SolSeaNFT", "Tensor_hq", "SquadsProtocol", "CivicMe",
            "SolriseFinance", "ZetaMarkets", "AtrixFinance", "SymmetryFi", "SolanaPay"
        ]
    },
    {
        "category": "News Outlets & Aggregators",
        "users": [
            "CoinDesk", "DecryptMedia", "TheBlock__", "CryptoSlate", "Cointelegraph",
            "NewsBTC", "CoinGapeNews", "CryptoBriefing", "BitcoinMagazine", "Blockworks_",
            "DLNewsCrypto", "CryptoNewsYes", "CoinSpectator", "CryptoPanicCom", "CoinJournal",
            "CryptoModeNews", "ChainwireNews", "UToday_en", "CryptoPotato", "BeInCrypto"
        ]
    }
]
    ;

const seedDatabase = async () => {
    try {
        await db();

        await X_Account.deleteMany({});
        logger.info("Existing data cleared.");

        let accounts = [];
        usernames.forEach(group => {
            group.users.forEach(username => {
                accounts.push({ username, category: group.category });
            });
        });

        await X_Account.insertMany(accounts);
        logger.info("Database seeded successfully.");

        mongoose.disconnect();
    } catch (error) {
        console.error("Error seeding database:", error);
        mongoose.disconnect();
    }
};

seedDatabase();
