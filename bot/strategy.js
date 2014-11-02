var bot = require('./bot');

exports.context = {
    count: 0
};

bot.useStat(function (data, stats, context) {
    stats.price2 = data.price / 2;
    context.count += 1;
});

bot.setStrategy(function (data, stats, context) {
    if (Math.random() < 0.1) {
        bot.buy(0.0001);
    } else if (Math.random() < 0.1) {
        bot.sell(0.0001);
    }
});
