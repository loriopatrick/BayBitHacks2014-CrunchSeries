var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var ncp = require('ncp');
var request = require('request');

var BOT_SRC = path.join(__dirname, '../bot');
var BOTS_DEST = path.join(__dirname, '../bots');

module.exports = function (attr) {
    var type = attr.type;
    var code = attr.code;
    var accessToken = attr.accessToken;
    var userId = attr.userId;
    var port = attr.port;
    var settings = attr.settings;
    var usdTransFee = attr.usdTransFee;

    var dest = path.join(BOTS_DEST, userId);
    var ready = false;
    var running = false;

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

    var command = [
        path.join(dest + '/index.js'),
        port,
            '"' + type + '"',
            '"' + accessToken + '"',
        settings.init.usd,
        settings.init.btc,
        settings.testRange.from,
        settings.testRange.to,
        settings.updateInterval,
        usdTransFee
    ].join(' ');

    function spawn() {
        console.log('spawn bot', command);
        var process = childProcess.exec('node ' + command);
        process.on('error', function (error) {
            console.log('bot error', error);
            badBot = error;
        });

        process.on('exit', function () {
            console.log('bot exit');
        });

        process.stdout.on('data', function () {
            console.log('bot spawned');
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
                return callback('no bot');
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