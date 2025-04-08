const express = require('express');
const { createBullBoard } = require('@bull-board/api');
const { ExpressAdapter } = require('@bull-board/express');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const {tokenQueue, riskQueue, X_Queue, NotificationQueue, TradeQueue, TradeStatusQueue, priceUpdateQueue} = require('./index');
const logger = require('../utils/logger');
const { BULL_ADMIN_QUEUE, BASE_URL, PORT } = process.env;

const app = express();

// Setup Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullMQAdapter(tokenQueue),
        new BullMQAdapter(riskQueue),
        new BullMQAdapter(X_Queue),
        new BullMQAdapter(NotificationQueue),
        new BullMQAdapter(TradeQueue),
        new BullMQAdapter(TradeStatusQueue),
        new BullMQAdapter(priceUpdateQueue),
    ],
    serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

app.listen(PORT, () => {
    logger.info(`✅ Bull Board running at ${BASE_URL}:${BULL_ADMIN_QUEUE}/admin/queues`);
});

module.exports = app;
