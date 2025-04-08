

async function generateUniqueUsername(walletAddress) {
    if (!walletAddress || walletAddress.length < 6) {
        throw new Error("Invalid wallet address.");
    }

    const username = `user_${walletAddress.slice(0, 6)}`;
    return username;
}

module.exports = { generateUniqueUsername }