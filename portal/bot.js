var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var ncp = require('ncp');
var request = require('request');

var commandBuilder = require('./commandBuilder');

var BOT_SRC = path.join(__dirname, '../bot');
var BOTS_DEST = path.join(__dirname, '../bots');

module.exports = function (attr) {
    var type = attr.type;
    var code = attr.code;
    var accessToken = attr.accessToken;
    var userId = attr.userId;
    var port = attr.port;
    var settings = attr.settings;

    var dest = path.join(BOTS_DEST, userId);
    var ready = false;

    var badBot = false;

    ncp(BOT_SRC, dest, function (err) {
        if (err) {
            console.log('copy error', err);
            throw err;
        }

        fs.writeFile(path.join(dest, 'strategy.js'), 'var bot = require(\'./bot\');\n' + code, function (err) {
            if (err) {
                console.log('write strategy error', err);
                throw err;
            }

            spawn();
        });
    });

    var command = commandBuilder([
        'node',
        path.join(dest + '/index.js'),
        port,
            '"' + type + '"',
            '"' + accessToken + '"',
        settings.init.usd,
        settings.init.btc,
        settings.testRange.from,
        settings.testRange.to,
        settings.updateInterval,
        settings.usdTransFee,
        settings.usdSpread
    ]);

    function spawn() {
        var process = childProcess.exec(command);
        process.on('error', function (error) {
            badBot = error;
        });

        process.on('exit', function () {
            ready = true;
        });

        process.stdout.on('data', function () {
            ready = true;
        });
    }

    this.getSnapshots = function (callback) {
        if (badBot) {
            return callback('bad bot');
        }

        if (!ready) {
            return callback({snapshots: [], type: type});
        }

        request.get('http://localhost:' + port + '/snapshots', function (error, response, body) {
            if (error) {
                return callback(badBot ? 'bad bot' : 'no bot');
            }

            var data = null;
            try {
                data = JSON.parse(body);
            } catch (e) {
                return callback('no bot');
            }

            callback(data);
        });
    };

    this.stop = function () {
        request.post('http://localhost:' + port + '/shutdown', function (err) {
        });
    };

    this.getPort = function () {
        return port;
    }
};