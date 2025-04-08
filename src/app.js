require('./startup/env');
require("./actions/index");
require('./queue/bullBoard');
require('./startup/uncaughtException');
const express = require("express");
require("express-async-errors");
const db = require('./startup/db');
const cors = require('cors');

const startTelegramBot = require('./startup/startTelegramBot');
const { getFilteredTokens } = require('./services/token.service');
const { executeTrade } = require('./services/Trade.service');
const TradeService = require('./services/Trade.service');
const logger = require('./utils/logger');

const app = express();

app.use(cors())

const server = require("http").createServer(app);


app.use(express.json());

async function main() {
  await db();
  await startTelegramBot();

  const { PORT } = process.env;

  server.listen(PORT, function () {
    logger.info(`listening on ${PORT}`);
  });
}

main();
require('./startup/startQueue');

