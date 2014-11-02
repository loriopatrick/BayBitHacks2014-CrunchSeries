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

    var realPrice = currentPrice + btcOrder / Math.abs(btcOrder) * exports.usdSpread;

    var order = {
        usdDelta: -btcOrder * realPrice - exports.usdTransFee,
        btcDelta: btcOrder,
        estimatedPrice: currentPrice,
        realPrice: realPrice
    };

    if (btcOrder < 0 && order.usdDelta < 0) {
        order.usdDelta = 0;
        order.btcDelta = 0;
    }

    callback(order);
};

exports.prep = function (callback) {
    callback();
};