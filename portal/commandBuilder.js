var settings = require('./settings');
var path = require('path');

var node_modules = path.join(__dirname, '../node_modules');

function buildDockerCommand(parts) {
    var cmd = [
        'docker run',
        '-v',
            parts[1].substr(0, parts[1].length - 9) + ':/bot',
        '-v',
            node_modules + ':/bot/node_modules',
        '-p',
            parts[2] + ':' + parts[2],
        settings.DOCKER_IMAGE,
        'node /bot/index.js'
    ];

    for (var i = 2; i < parts.length; ++i) {
        cmd.push(parts[i]);
    }

    return cmd.join(' ');
}

function localCommand(parts) {
    return parts.join(' ');
}

module.exports = settings.USE_DOCKER? buildDockerCommand : localCommand;