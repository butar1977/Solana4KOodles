const logger = require("../utils/logger");

process.on('uncaughtException', (error, source) => {
  console.log(error);
  logger.error(error)
});
