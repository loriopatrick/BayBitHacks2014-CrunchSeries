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

app.use('/api/set-bot', function (req, res) {
    var code = req.code;
    var bot = new Bot(code);
    res.send('something...');
});

app.listen(5050);