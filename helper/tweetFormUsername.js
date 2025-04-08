const axios = require("axios");
const logger = require("../src/utils/logger");
const usernames = [
    // Solana Official & Ecosystem (10)
    ["Solana", "SolanaFndn", "solana_devs", "aeyakovenko", "rajgokal", "SolanaStatus", "SolanaLabs", "SolanaNews", "SolanaCommunity", "SolanaValidator"],

    // Key Influencers & Traders (50)
    ["anndylian", "CryptoMessiah", "zachxbt", "CryptoTony__", "EllioTrades", "CryptoKaleo", "Pentosh1", "HsakaTrades", "CryptoDonAlt", "TheCryptoDog"],
    ["degentony", "Slumpforapump69", "0xfoobar", "brian_armstrong", "cz_binance", "inversebrah", "sassal0x", "lucasx_xrp", "mooncarl", "AltcoinGordon"],
    ["CryptoWizardd", "TraderSZ", "CryptoGemsCom", "CryptoRandy", "MartyBoots", "JRNYcrypto", "CryptoBitlord", "ScottLEOWarrior", "CryptoHustle", "CryptoGainz"],
    ["0xShaun", "DaanCrypto", "CredibleCrypto", "RookieXBT", "CryptoNewton", "TraderKoz", "CryptoCapo_", "DonnieBigBags", "CryptoMocho", "TheMoonCarl"],
    ["Bitboy_Crypto", "CryptoBull", "AltcoinDailyio", "CryptoWhale", "CryptoYoddha", "CryptoBusy", "CryptoSniperX", "MisterCryptoX", "CryptoInsightUK"],

    // Meme Coin Specialists & Communities (40)
    ["solana_memes", "MemeCoinHunter", "SolanaSniper", "BonkInu", "DogwifhatSOL", "PopcatSOL", "GigachadToken", "FartcoinSOL", "TrumpSOL", "SlerfToken"],
    ["MichiToken", "MumuTheBull", "BookOfMemeSOL", "CatInADogsWorld", "PenguSOL", "PnutToken", "SolamaToken", "SmogToken", "FronkToken", "Moonlana"],
    ["SolDoge", "SolanaMemeLord", "MemeCoinDegens", "SolanaPumpFun", "MemeTokenRadar", "SolanaMoonshots", "CryptoMemeHub", "SolanaMemeKing", "MemeCoinSniper", "SolanaHypeTrain"],
    ["MemeCoinAlerts", "SolanaDegenClub", "MemeCoinInsider", "SolanaTokenWatch", "MemeCoinGang", "SolanaMemeDaily", "TokenSnipeBot", "SolanaMemeRadar", "MemeCoinVibes"],

    // Projects & Platforms (30)
    ["pumpdotfun", "RaydiumProtocol", "JupiterExchange", "Orca_so", "SerumDeFi", "Phantom", "SolflareWallet", "BackpackApp", "MagicEden", "StepFinance_"],
    ["MarinadeFinance", "Saber_HQ", "MangoMarkets", "AldrinExchange", "DriftProtocol", "SolendProtocol", "MercurialFi", "PsyOptions", "KatanaFinance", "AuroryProject"],
    ["StarAtlas", "SolSeaNFT", "Tensor_hq", "SquadsProtocol", "CivicMe", "SolriseFinance", "ZetaMarkets", "AtrixFinance", "SymmetryFi", "SolanaPay"],

    // News Outlets & Aggregators (20)
    ["CoinDesk", "DecryptMedia", "TheBlock__", "CryptoSlate", "Cointelegraph", "NewsBTC", "CoinGapeNews", "CryptoBriefing", "BitcoinMagazine", "Blockworks_"],
    ["DLNewsCrypto", "CryptoNewsYes", "CoinSpectator", "CryptoPanicCom", "CoinJournal", "CryptoModeNews", "ChainwireNews", "UToday_en", "CryptoPotato", "BeInCrypto"]
];

// const BEARER_TOKEN = ""; // Add your Twitter API Bearer Token here
const BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAADcfzwEAAAAASwIjjjsMPGe5Ug6euPgQCr34z6s%3DwIg9PwVqq5k7hF1DicUK0YDo0DpqwEE4LSWqnQL9meFu1FvlI3";


const fetchTweets = async () => {
    for (let i = 0; i < usernames.length; i++) {
        const batch = usernames[i];

        // console.log(`Fetching tweets for Batch ${i + 1}: ${batch.join(", ")}`);

        // Split large batches into sub-batches to prevent exceeding 512 characters
        let subBatchSize = 5; // Adjust as needed to stay under 512 chars
        for (let j = 0; j < batch.length; j += subBatchSize) {
            const subBatch = batch.slice(j, j + subBatchSize);
            const query = subBatch.map(user => `from:${user}`).join(" OR ");
            const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=100&tweet.fields=created_at,public_metrics`;
            logger.info(url)
            
            try {
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
                });

                logger.info(`Batch ${i + 1} - SubBatch ${j / subBatchSize + 1}: ${subBatch.join(", ")}`);
                logger.info(response.data);
            } catch (error) {
                logger.error(`Error fetching tweets for Batch ${i + 1} - SubBatch ${j / subBatchSize + 1}`, error.response?.data || error.message);
            }

            // Rate limit handling: Wait 4 seconds between requests
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    }
};

fetchTweets();
