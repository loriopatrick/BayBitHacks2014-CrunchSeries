var database = require('./database');
var Bot = require('./bot');

var bots = {};
var portRange = [3000, 5000];
var currentPort = portRange[0];
var activePorts = {};

function getPort() {
    while (activePorts[currentPort]) {
        ++currentPort;
        if (currentPort > portRange[1]) {
            currentPort = portRange[0];
        }
    }
    return currentPort;
}

function getId(user) {
    return user._id.toString();
}

function destroyBot(id) {
    bots[id].stop();
    activePorts[bots[id].getPort()] = false;
    delete bots[id];
}

function registerBot(id, bot) {
    bots[id] = bot;
    activePorts[bot.getPort()] = true;
}

var TYPES = ['back', 'sim', 'live'];

module.exports = function (app) {
    app.post('/api/run', function (req, res) {
        var type = req.query.type;
        if (!type) {
            return res.send('type is required', 500);
        }
        if (TYPES.indexOf(type) == -1) {
            return res.send('invalid type: ' + type, 500);
        }

        var user = req.user;

        var userId = getId(user);
        if (userId in bots) {
            destroyBot(userId);
        }

        var bot = new Bot({
            type: type,
            code: user.code,
            accessToken: user.accessToken,
            userId: userId,
            port: getPort(),
            settings: user.settings
        });

        registerBot(userId, bot);

        res.send('bot started');
    });

    app.use('/api/bot', function (req, res, next) {
        var userId = getId(req.user);

        if (!(userId in bots)) {
            return res.send('no bot');
        }
        req.bot = bots[userId];
        next();
    });

    app.get('/api/bot/snapshots', function (req, res) {
        req.bot.getSnapshots(function (data) {
            res.send(data);
        });
    });

    app.post('/api/bot/stop', function (req, res) {
        destroyBot(getId(req.user));
        res.send('shutting down');
    });
};