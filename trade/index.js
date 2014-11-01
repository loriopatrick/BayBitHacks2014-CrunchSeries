var backend = require('./sim');

backend.prep(function () {
    var bot = require('./bot');
    bot.setup(backend);
    require('./strategy');
    bot.start(0, 10, function (context) {
        context.count = 0;
    });
});
