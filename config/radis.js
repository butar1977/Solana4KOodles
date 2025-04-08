const { RADID_HOST, RADIS_PORT } = process.env;

module.exports.redisConfig = {
    host: RADID_HOST,
    port: RADIS_PORT,
    maxRetriesPerRequest: null,
};
