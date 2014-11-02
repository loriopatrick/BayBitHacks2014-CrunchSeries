var fs = require('fs');
var path = require('path');
var ncp = require('ncp');

var BOT_SRC = path.join(__dirname, '../bot');
var BOTS_DEST = path.join(__dirname, '../bots');

module.exports = function (strategy) {
    var dest = path.join(BOTS_DEST, 'test-bot');
    ncp(BOT_SRC, dest, function (err) {
        if (err) throw err;
    });

    fs.writeFile(path.join(dest, 'strategy.js'), 'var bot = require(\'./bot\');\n' + strategy, function (err) {
        if (err) throw err;
    });
};