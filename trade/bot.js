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

exports.buy = function (quantity) {
    currentBtcOrder += quantity;
};

exports.sell = function (quantity) {
    currentBtcOrder -= quantity;
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

    strategy(data, stats, context);
    if (shutdown) return doShutdown();

    next();
}

function next() {
    orderExecutor(currentBtcOrder, function (orderResult) {
        currentBtcOrder = 0;
        priceSource(function (price) {
            if (orderResult) {
                usd += orderResult.usdDelta;
                btc += orderResult.btcDelta;
            }

            tick(price, orderResult);
        });
    });
}

exports.start = function (initBtc, initUsd, init) {
    currentBtcOrder = 0;
    btc = initBtc;
    usd = initUsd;

    running = true;

    init(context);
    next();
};

exports.stop = function () {
    shutdown = true;
};

function doShutdown() {
    shutdown = false;
    running = false;
}