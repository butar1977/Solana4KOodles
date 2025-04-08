
const bs58 = require("bs58");

const validateSolanaAddress = (text) => {
    const solanaRegex = /\b[a-zA-Z0-9]{32,44}\b/g; // Match 32 to 44 character Base58 strings
    const matches = text.match(solanaRegex);

    if (!matches) return null;

    for (const match of matches) {
        try {
            const decoded = bs58.decode(match);
            if (decoded.length === 32) return match;
        } catch (error) {
            continue;
        }
    }

    return null;
};

module.exports = { validateSolanaAddress };
