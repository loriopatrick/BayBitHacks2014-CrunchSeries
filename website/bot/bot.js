var code = window.location.href.split('code=')[1];

var mirror = null;
var data = null;
var lastTime = 0;

$(function () {
//    chart();
    mirror = CodeMirror($('#code').get(0), {
        value: initCode,
        mode: 'javascript'
    });
});

function run() {
    data = null;
    lastTime = 0;
    $.post('/api/set-bot?code=' + code, {code: mirror.getValue()}, function (data, text) {
        console.log(text);
    });

    var currentIndex = -1;

    var interval = setInterval(function () {
        $.get('/api/bot/snapshots?code=' + code, function (data) {
            if (data === 'no bot') {
                return clearInterval(interval);
            }

            if (data === 'bad bot') {
                alert('There is an error in your bot');
                return clearInterval(interval);
            }

            if (data.snapshots.length > currentIndex) {
                updateData(data.snapshots, currentIndex);
                currentIndex = data.snapshots.length;
            }

            if (!data.running && data.snapshots.length) {
                clearInterval(interval);
            }
        });
    }, 500);
}

function updateData(snapshots, index) {
    if (index == -1) return;

    console.log(index);

    if (data == null) {
        data = [
            [],
            []
        ];
    }

    for (var i = index; i < snapshots.length; ++i) {
        var s = snapshots[i];
        if (s.data.time < lastTime) continue;

        if (s.data.orderResult) {
            addTransaction({
                type: s.data.orderResult.btcDelta > 0 ? 'BUY' : 'SELL',
                price: '$' + s.data.orderResult.realPrice,
                btc: '฿' + Math.abs(s.data.orderResult.btcDelta),
                time: new Date(s.data.time).toString()
            });
        }

        lastTime = s.data.time;
        data[0].push([s.data.time, s.stats.pricePerformance]);
        data[1].push([s.data.time, s.stats.balancePerformance]);
    }

    chart();
}

function addTransaction(transaction) {
    var $trans = $('#trans');
    var $new = $('<tr>' +
        '<td class="trans-' + transaction.type + '">' + transaction.type + '</td>' +
        '<td>' + transaction.price + '</td>' +
        '<td>' + transaction.btc + '</td>' +
        '<td>' + transaction.time + '</td>' +
        '</tr>');
    $trans.prepend($new);
    console.log(transaction);
}

function chart() {
    $.plot($("#chart"), data, {
        series: {
            lines: { show: true, fill: false},
            points: { show: false}
        },
        grid: { color: 'transparent' },
        xaxis: {
            color: 'black',
            font: { color: 'black', family: 'sans-serif', size: 11}
        },
        yaxis: {
            color: 'black',
            font: { color: 'black', family: 'sans-serif', size: 11}
        },
        colors: ['rgb(143, 198, 242)', 'rgb(242, 198, 143)']
    });
}

var initCode = '\nbot.setInit(function (context) {\n  context.count = 0;\n});\n\nbot.useStat(function (data, stats, context) {\n  stats.price2 = data.price / 2;\n  context.count += 1;\n});\n\nbot.setStrategy(function (data, stats, context) {\n  if (Math.random() < 0.1) {\n    bot.buy(1);\n  } else if (Math.random() < 0.1) {\n    bot.sell(1);\n  }\n});\n';