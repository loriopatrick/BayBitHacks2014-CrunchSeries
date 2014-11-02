var express = require('express');

var app = express();

var snapshots = [];

var bot = require('./bot');

var port = parseInt(process.argv[2]);
var type = process.argv[3];
var accessToken = process.argv[4];
var initUsd = parseFloat(process.argv[5]);
var initBtc = parseFloat(process.argv[6]);
var fromTime = parseInt(process.argv[7]);
var toTime = parseInt(process.argv[8]);
var updateInterval = parseInt(process.argv[9]);
var usdTransFee = parseFloat(process.argv[10]);
var usdSpread = parseFloat(process.argv[11]);

var backend = require('./backends/' + type);

backend.toTime = toTime;
backend.fromTime = Math.min(Math.max(fromTime, toTime - 3600 * 1000 * 24 * 7), toTime - 3600 * 1000 * 24);
backend.updateInterval = updateInterval;
backend.accessToken = accessToken;
backend.usdTransFee = usdTransFee;
backend.usdSpread = usdSpread;

bot.addSettingsToContext({
    updateInterval: updateInterval,
    usdTransFee: usdTransFee,
    usdSpread: usdSpread,
    initUsd: initUsd,
    initBtc: initBtc
});

backend.prep(function () {
    bot.setup(backend);

    var firstPrice = null, firstBalance = null;

    bot.useStat(function (data, stats) {
        if (!firstPrice) {
            firstPrice = data.price;
            firstBalance = data.balance.usd + data.balance.btc * data.price;
        }

        stats._pricePerformance = data.price / firstPrice;
        stats._balancePerformance = (data.balance.usd + data.balance.btc * data.price) / firstBalance;
    });

    require('./strategy');

    bot.useStat(function (data, stats, context) {
        snapshots.push(clone({
            data: data,
            stats: stats,
            context: context
        }));
    });

    bot.start(initBtc, initUsd);
});

function clone(a) {
    return JSON.parse(JSON.stringify(a));
}

var exitCount = 0;

app.get('/snapshots', function (req, res) {
    res.send({snapshots: snapshots, type: type});

    if (exitCount > 2) {
        process.exit();
    }

    if (!bot.isRunning() && snapshots.length) {
        exitCount += 1;
    } else {
        exitCount = 0;
    }
});

app.post('/stop', function (req, res) {
    bot.stop();
    res.send({msg: 'stopping bot'});
});

app.post('/shutdown', function (req, res) {
    res.send({msg: 'shutting down'});
    process.exit();
});


app.listen(port);
console.log('listening');