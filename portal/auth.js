var request = require('request');
var rand = require("generate-key");
var settings = require('./settings');
var database = require('./database');

var redirectURI = settings.BASE_URL + '/auth';

function newUser() {
    return {
        loginKey: rand.generateKey(20),
        settings: {
            init: {usd: 100, btc: 0},
            testRange: {
                from: new Date().getTime() - 1000 * 60 * 60 * 24 * 10,
                to: new Date().getTime()
            },
            updateInterval: 200,
            usdTransFee: 0.15,
            usdSpread: 0.5
        },
        code: '\nbot.setInit(function (context) {\n  context.count = 0;\n});\n\nbot.useStat(function (data, stats, context) {\n  stats.price2 = data.price / 2;\n  context.count += 1;\n});\n\nbot.setStrategy(function (data, stats, context) {\n  if (Math.random() < 0.1) {\n    bot.buy(1);\n  } else if (Math.random() < 0.1) {\n    bot.sell(1);\n  }\n});\n'
    };
}

function createUser(accessToken, callback) {
    var users = database.mongo.collection('users');
    var token = accessToken['access_token'];

    request.get('https://api.coinbase.com/v1/users?access_token=' + token,
        function (error, response, body) {
            var data = JSON.parse(body);
            var userId = data['users'][0].id;

            users.findOne({userId: userId}, function (err, user) {
                if (err) throw err;

                if (user) {
                    return users.update({'_id': user._id}, {$set: {
                        accessToken: token,
                        expire: new Date().getTime() + accessToken['expires_in'] * 1000
                    }}, function (err) {
                        if (err) throw err;
                        return callback(user.loginKey);
                    });
                }

                user = newUser();
                user.accessToken = token;
                user.expire = new Date().getTime() + accessToken['expires_in'] * 1000;

                users.insert(user, function (err) {
                    if (err) throw err;
                    callback(user.loginKey);
                });
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
                createUser(accessToken, function (key) {
                    res.redirect('/bot?token=' + key);
                });
            });
    });

    app.use('/api', function (req, res, next) {
        var token = req.query.token;
        if (!token) {
            return res.send('unauthorized', 401);
        }

        var users = database.mongo.collection('users');
        users.findOne({loginKey: token}, function (err, user) {
            if (err) throw err;
            if (!user) return res.send('unauthorized', 401);
            req.user = user;
            next();
        });
    });
};