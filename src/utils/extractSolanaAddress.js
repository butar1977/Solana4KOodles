const extractSolanaAddress = (text) => {
    const solanaRegex = /\b[a-zA-Z0-9]{44}\b/g;
    const matches = text.match(solanaRegex);
    return matches ? matches[0] : null;
}


module.exports = {
    extractSolanaAddress
}