var express = require('express');
var backend = require('./sim');

var app = express();

var snapshots = [];
var currentSnap = 0;

var bot = require('./bot');

backend.prep(function () {
    bot.setup(backend);
    bot.useStat(function (data, stats, context) {
        if (!context.firstPrice) {
            context.firstPrice = data.price;
            context.firstBalance = data.balance.usd + data.balance.btc * data.price;
        }

        stats.pricePerformance = data.price / context.firstPrice;
        stats.balancePerformance = (data.balance.usd + data.balance.btc * data.price) / context.firstBalance;
    });

    require('./strategy');

    bot.useStat(function (data, stats, context) {
        snapshots.push(clone({
            data: data,
            stats: stats,
            context: context
        }));
    });

    bot.start(0, 100);
});

function clone(a) {
    return JSON.parse(JSON.stringify(a));
}

app.get('/snapshots', function (req, res) {
    res.send({snapshots: snapshots, running: bot.isRunning(), newSnap: currentSnap});
    currentSnap = snapshots.length;
});

app.post('/stop', function (req, res) {
    bot.stop();
    res.send({msg: 'stopping bot'});
});

app.post('/shutdown', function (req, res) {
    res.send({msg: 'shutting down'});
    process.exit();
});


app.listen(process.argv[2]);