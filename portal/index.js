var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var database = require('./database');
var Bot = require('./bot');

var app = express();

app.use('/', express.static(path.join(__dirname, '../website')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', function (req, res, next) {
    if (!req.query.code) {
        return res.redirect('/');
    }

    var users = database.mongo.collection('users');
    users.findOne({code: req.query.code}, function (err, user) {
        if (err) throw err;
        if (!user) return res.redirect('/');
        req.user = user;
        next();
    });
});

require('./auth')(app);

var bots = {};

app.post('/api/run-bot', function (req, res) {
    var code = req.body.code;

    if (req.user.code in bots) {
        if (bots[req.user.code].ready) {
            bots[req.user.code].stop();
        }
        bots[req.user.code] = null;
    }

    // todo: update bot code

    var bot = bots[req.user.code] = new Bot(code, req.user.code, 3000);
    res.send('bot started');
});

app.use('/api/bot', function (req, res, next) {
    var userCode = req.user.code;
    if (!(userCode in bots)) {
        return res.send('no bot');
    }
    req.bot = bots[userCode];
    next();
});

app.get('/api/bot/snapshots', function (req, res) {
    req.bot.getSnapshots(function (data) {
        res.send(data);
    });
});

app.post('/api/bot/shutdown', function (req, res) {
    req.bot.stop();
    res.send('shutting down');
});

app.get('/api/get-code', function (req, res) {
    if (req.user.botCode) {
        return res.send(req.user.botCode);
    }

    res.send('\nbot.setInit(function (context) {\n  context.count = 0;\n});\n\nbot.useStat(function (data, stats, context) {\n  stats.price2 = data.price / 2;\n  context.count += 1;\n});\n\nbot.setStrategy(function (data, stats, context) {\n  if (Math.random() < 0.1) {\n    bot.buy(1);\n  } else if (Math.random() < 0.1) {\n    bot.sell(1);\n  }\n});\n');
});

app.listen(parseInt(5050));