var request = require('request');

var lastGrabTime = 0;
var currentPrice = 0;

exports.priceSource = function (callback) {
    var now = new Date().getTime();
    var wait = exports.updateInterval + lastGrabTime - now;

    if (wait > 50) {
        return setTimeout(function () {
            exports.priceSource(callback);
        }, wait);
    }

    lastGrabTime = now;

    request.get('https://api.coinbase.com/v1/prices/spot_rate', function (err, response, body) {
        if (err) throw err;
        var data = JSON.parse(body);
        if (data['currency'] !== 'USD') {
            throw new Error('API Changed WTF!');
        }

        currentPrice = parseFloat(data.amount);
        callback({price: currentPrice, time: now});
    });
};

exports.orderExecutor = function (btcOrder, callback) {
    if (!btcOrder) return callback(null);

    callback({
        usdDelta: -btcOrder * currentPrice,
        btcDelta: btcOrder,
        estimatedPrice: currentPrice,
        realPrice: currentPrice
    });
};

exports.prep = function (callback) {
    callback();
};