var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var ncp = require('ncp');
var request = require('request');

var BOT_SRC = path.join(__dirname, '../bot');
var BOTS_DEST = path.join(__dirname, '../bots');

var onready = [];

module.exports = function (strategy, code, port) {
    var dest = path.join(BOTS_DEST, code);
    var self = this;

    var ready = false;

    // copy over base bot
    ncp(BOT_SRC, dest, function (err) {
        if (err) throw err;

        // write the strategy
        fs.writeFile(path.join(dest, 'strategy.js'), 'var bot = require(\'./bot\');\n' + strategy, function (err) {
            if (err) throw err;

            // todo: write the settings file for oath
            // todo: write file to set sim or live
            spawn();
        });
    });

    this.getSnapshots = function (callback) {
        if (!ready) return callback({snapshots: [], running: false, newSnap: -1});

        var self = this;

        request.get('http://localhost:' + port +'/snapshots', function (error, response, body) {
            if (error) {
                return callback('bad bot');
            }

            var data = JSON.parse(body);
            callback(data);

            if (!data.running && data.snapshots.length > 0) {
                self.stop();
            }
        });
    };

    function spawn() {
        childProcess.spawn('node', [path.join(dest + '/index.js'), port]);
        setTimeout(function () {
            ready = true;
        }, 1000);
    }

    this.stop = function () {
        request.post('http://localhost:' + port + '/shutdown', function (error) {
        });
        ready = false;
    };
};