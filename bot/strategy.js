var bot = require('./bot');

bot.setStrategy(function () {
    console.log('run strat', arguments);
});