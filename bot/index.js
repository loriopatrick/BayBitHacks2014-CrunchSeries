var process = require('process');
var express = require('express');
var backend = require('./sim');

var app = express();

var snapshots = [];
var currentSnap = 0;

var bot = require('./bot');

backend.prep(function () {
    bot.setup(backend);
    var sContext = require('./strategy').context;
    bot.useStat(function (data, stats, context) {
        snapshots.push(clone({
            data: data,
            stats: stats,
            context: context
        }));
    });

    bot.start(0, 10, function (context) {
        for (var key in sContext) {
            context[key] = sContext[key];
        }
    });
});

function clone(a) {
    return JSON.parse(JSON.stringify(a));
}

app.get('/snapshots', function (req, res) {
    res.send({snapshots: snapshots, running: bot.isRunning()});
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


app.listen(3000);