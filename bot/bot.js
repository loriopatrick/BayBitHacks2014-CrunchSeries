var currentBtcOrder = 0;
var usd = 0;
var btc = 0;

var running = false;
var shutdown = false;
var strategy = null;
var statistics = [];

var priceSource = null;
var orderExecutor = null;

var context = {};

var init = null;

var currentPrice = 0;

exports.setup = function (backend) {
    priceSource = backend.priceSource;
    orderExecutor = backend.orderExecutor;
};

exports.useStat = function (stat) {
    statistics.push(stat);
};

exports.setStrategy = function (strat) {
    strategy = strat;
};

exports.setInit = function (fn) {
    init = fn;
};

exports.buy = function (quantity) {
    if (!quantity) return;
    currentBtcOrder = Math.min(currentBtcOrder + quantity, usd / currentPrice.price);
//    console.log(quantity, currentBtcOrder, usd, currentPrice);
};

exports.sell = function (quantity) {
    if (!quantity) return;
    currentBtcOrder = Math.max(currentBtcOrder - quantity, -btc);
//    console.log(quantity, currentBtcOrder, usd, currentPrice);
};

exports.isRunning = function () {
    return running;
};

function tick(priceData, orderResult) {
    if (!priceData) return doShutdown();

    var data = {
        price: priceData.price,
        time: priceData.time,
        balance: {
            usd: usd,
            btc: btc
        },
        orderResult: orderResult
    };

    var stats = {};
    for (var i = 0; i < statistics.length; ++i) {
        statistics[i](data, stats, context);
    }

    if (strategy) strategy(data, stats, context);
    if (shutdown) return doShutdown();

    next();
}

function next() {
    orderExecutor(currentBtcOrder, function (orderResult) {
        currentBtcOrder = 0;
        priceSource(function (price) {
            currentPrice = price;

            if (orderResult) {
                usd += orderResult.usdDelta;
                btc += orderResult.btcDelta;
            }

            tick(price, orderResult);
        });
    });
}

exports.start = function (initBtc, initUsd) {
    currentBtcOrder = 0;
    btc = initBtc;
    usd = initUsd;

    running = true;

    if (init) init(context);
    next();
};

exports.stop = function () {
    shutdown = true;
};

function doShutdown() {
    shutdown = false;
    running = false;
}