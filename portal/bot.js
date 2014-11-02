var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var ncp = require('ncp');
var request = require('request');

var BOT_SRC = path.join(__dirname, '../bot');
var BOTS_DEST = path.join(__dirname, '../bots');

var onready = [];

module.exports = function (strategy, code) {
    var dest = path.join(BOTS_DEST, code);
    var self = this;

    var ready = false;
    var running = false;

    // copy over base bot
    ncp(BOT_SRC, dest, function (err) {
        if (err) throw err;

        // write the strategy
        fs.writeFile(path.join(dest, 'strategy.js'), 'var bot = require(\'./bot\');\n' + strategy, function (err) {
            if (err) throw err;

            // todo: write the settings file for oath
            // todo: write file to set sim or live
            ready = true;
            while (onready.length) {
                onready.pop()();
            }
        });
    });

    this.getSnapshots = function (callback) {
        if (!ready || !running) return callback({snapshots: [], running: false, newSnap: -1});

        request.get('http://localhost:3000/snapshots', function (error, response, body) {
            if (error) {
                return callback('bad bot');
            }

            callback(JSON.parse(body));
        });
    };

    this.start = function () {
        if (!ready) {
            var self = this;
            return onready.push(function () {
                self.start();
            })
        }

        childProcess.spawn('node', [path.join(dest + '/index.js')]);
        running = true;
    };

    this.stop = function () {
        request.post('http://localhost:3000/shutdown', function (error) {
            if (error) throw error;
        });
    };
};