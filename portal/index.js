var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var database = require('./database');
var Bot = require('./bot');

var app = express();

app.use('/', express.static(path.join(__dirname, '../website')));
app.use(bodyParser.json());

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

    var bot = bots[req.user.code] = new Bot(code, req.user.loginKey, 3000);
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

app.get('/api/account', function (req, res) {
    return res.send({
        settings: req.user.settings,
        code: req.user.code
    });
});

app.post('/api/settings', function (req, res) {
    var settings = req.body;
    if (!settings) return res.send('settings required', 500);

    var users = database.mongo.collection('users');
    users.update({_id: req.user._id}, {$set: {
        settings: settings
    }}, function (err) {
        if (err) throw err;
        res.send('updated');
    });
});

app.post('/api/code', function (req, res) {
    var code = req.body.code;
    if (!code) return res.send('code required', 500);

    var users = database.mongo.collection('users');
    users.update({_id: req.user._id}, {$set: {
        code: code
    }}, function (err) {
        if (err) throw err;
        res.send('updated');
    });
});

app.listen(5050);