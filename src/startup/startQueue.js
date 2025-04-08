const tokenWorker = require('../queue/worker');
const riskWorker = require('../queue/riskWorker');
const TradeWorker = require('../queue/TradeWorker');
const TradeStatus = require('../queue/TradeStatus');
const priceUpdateWorker = require('../queue/TokenPriceWorker');
const X_Worker = require('../queue/X_Worker');

TradeWorker;
tokenWorker; // ✅ Start worker
riskWorker;
TradeStatus;
priceUpdateWorker;
X_Worker;
