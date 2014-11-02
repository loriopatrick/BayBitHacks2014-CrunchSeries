var bot = require('./bot');

bot.setInit(function (context) {
    context.count = 0;
});

bot.useStat(function (data, stats, context) {
    stats.prices = {
        half: data.price / 2,
        normal: data.price
    };
    context.count += 1;
});

bot.setStrategy(function (data, stats, context) {
    if (Math.random() < 0.1) {
        bot.buy(1);
    } else if (Math.random() < 0.1) {
        bot.sell(1);
    }
});
