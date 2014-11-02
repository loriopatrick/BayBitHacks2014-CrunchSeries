var code = window.location.href.split('code=')[1];

var mirror = null;

$(function () {
    doChart();
    mirror = CodeMirror($('#code').get(0), {
        value: initCode,
        mode: 'javascript'
    });
});

function run() {
    $.post('/api/set-bot?code=' + code, {code: mirror.getValue()}, function (data, text) {
        console.log(data, text);
    })
}

function doChart() {

    $.plot($("#chart"), [
        [
            [0, 0],
            [1, 1],
            [2, 0]
        ]
    ], {
        series: {
            lines: { show: true, fill: true, fillColor: 'rgba(143, 198, 242, 0.7)' },
            points: { show: true}
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
        colors: ['rgba(143, 198, 242, 1)']
    });
}

var initCode = '\nexports.context = {\n    count: 0\n};\n\nbot.useStat(function (data, stats, context) {\n    stats.price2 = data.price / 2;\n    context.count += 1;\n});\n\nbot.setStrategy(function (data, stats, context) {\n    if (Math.random() < 0.1) {\n        bot.buy(0.0001);\n    } else if (Math.random() < 0.1) {\n        bot.sell(0.0001);\n    }\n});\n';