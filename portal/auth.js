var request = require('request');
var rand = require("generate-key");
var settings = require('./settings');
var database = require('./database');

var redirectURI = 'https://localhost:5050/auth';

function createUser(code, accessToken, callback) {
    var users = database.mongo.collection('users');

    users.findOne({code: code}, function (err, user) {
        if (err) throw err;
        if (user) return callback(code);

        users.insert({
            accessToken: accessToken,
            code: code
        }, function (err) {
            if (err) throw err;
            callback(code);
        });
    });
}

module.exports = function (app) {
    app.get('/login', function (req, res) {
        res.redirect('https://www.coinbase.com/oauth/authorize?' +
            'response_type=code' +
            '&client_id=' + settings.COIN_BASE.CLIENT_ID +
            '&redirect_uri=' + redirectURI +
            '&scope=' + 'user');
    });

    app.get('/auth', function (req, res) {
        var code = req.query.code;
        request.post('https://www.coinbase.com/oauth/token?grant_type=authorization_code' +
                '&code=' + code +
                '&redirect_uri=' + redirectURI +
                '&client_id=' + settings.COIN_BASE.CLIENT_ID +
                '&client_secret=' + settings.COIN_BASE.CLIENT_SECRET,
            function (error, response, body) {
                var accessToken = JSON.parse(body);
                createUser(code, accessToken, function (code) {
                    res.redirect('/bot?code=' + code);
                });
            });
    });
};