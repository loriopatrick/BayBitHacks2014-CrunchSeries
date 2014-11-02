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

app.post('/api/set-bot', function (req, res) {
    var code = req.body.code;

    if (req.user.code in bots) {
        bots[req.user.code].stop();
    }

    var bot = bots[req.user.code] = new Bot(code, req.user.code);
    bot.start();

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
    req.bot.shutdown();
    res.send('shutting down');
});

app.listen(5050);