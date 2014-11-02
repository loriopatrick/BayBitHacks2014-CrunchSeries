var database = require('./database');

module.exports = function (app) {
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
};