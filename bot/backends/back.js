var request = require('request');

var prices = [];
var currentPrice = 0;

exports.priceSource = function (callback) {
    currentPrice = prices.pop();
    callback(currentPrice);
};

exports.orderExecutor = function (btcOrder, callback) {
    if (!btcOrder) return callback(null);

    var realPrice = currentPrice.price + btcOrder / Math.abs(btcOrder) * exports.usdSpread;

    var order = {
        usdDelta: -btcOrder * realPrice - exports.usdTransFee,
        btcDelta: btcOrder,
        estimatedPrice: currentPrice.price,
        realPrice: realPrice
    };

    if (btcOrder < 0 && order.usdDelta < 0) {
        order.usdDelta = 0;
        order.btcDelta = 0;
    }

    callback(order);
};

var fs = require('fs');
var path = require('path');

exports.prep = function (done) {
    var page = 0;

    var cacheFile = path.join(__dirname, '../prices-' + exports.fromTime + '-' + exports.toTime + '.json');
    fs.exists(cacheFile, function (exists) {
        if (exists) {
            return fs.readFile(cacheFile, function (err, file) {
                if (err) throw err;
                prices = JSON.parse(file);
                done();
            });
        }

        getNext(next);
    });

    function finish() {
        fs.writeFile(cacheFile, JSON.stringify(prices), function () {
        });
        done();
    }

    function getNext(callback) {
        request.get('https://api.coinbase.com/v1/prices/historical?page=' + page, function (err, response, body) {
            if (err) throw err;

            var rawPrices = body.split('\n');
            for (var i = 0; i < rawPrices.length; ++i) {
                var parts = rawPrices[i].split(',');
                var date = Date.parse(parts[0]);
                if (date < exports.fromTime) {
                    return finish();
                }
                if (date > exports.toTime) {
                    continue;
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
};

