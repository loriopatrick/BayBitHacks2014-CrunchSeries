var request = require('request');

var prices = [];
var currentPrice = 0;

exports.priceSource = function (callback) {
    currentPrice = prices.pop();
    callback(currentPrice);
};

exports.orderExecutor = function (btcOrder, callback) {
    if (!btcOrder) return callback(null);

    callback({
        usdDelta: -btcOrder * currentPrice.price,
        btcDelta: btcOrder,
        estimatedPrice: currentPrice.price,
        realPrice: currentPrice.price
    });
};

exports.prep = function (done) {
    var since = Date.parse('2014-10-25T13:57:38-07:00');
    var page = 0;

    function getNext(callback) {
        cacheRequest('https://api.coinbase.com/v1/prices/historical?page=' + page, function (error, response, body) {
            var rawPrices = body.split('\n');
            for (var i = 0; i < rawPrices.length; ++i) {
                var parts = rawPrices[i].split(',');
                var date = Date.parse(parts[0]);
                if (date < since) {
                    return done();
                }
                var price = parseFloat(parts[1]);
                prices.push({time: date, price: price});
            }
            callback();
        });
    }

    function next() {
        page += 1;
        getNext(next);
    }

    getNext(next);
};

var fs = require('fs');

function cacheRequest(url, callback) {
    request(url, callback);
}