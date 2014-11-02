var code = window.location.href.split('code=')[1];

var mirror = null;
var data = [[],[]];
var lastTime = 0;

$(function () {
    $.get('/api/get-code?code=' + code, function (code) {
        mirror = CodeMirror($('#code').get(0), {
            value: code,
            mode: 'javascript',
            viewportMargin: Infinity,
            lineWrapping: true
        });
    });

    reset();
    pollData(); // tie into any current running bots
});

function run() {
    reset();
    $.post('/api/run-bot?code=' + code, {code: mirror.getValue()});
    pollData();
}

function reset() {
    data = [[],[]];
    lastTime = 0;
    $('#trans').empty();
    chart($('#chart'), data);
    $('#usd-balance').html('');
    $('#btc-balance').html('');
}

function pollData() {
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

    if (snapshots.length) {
        var last = snapshots[snapshots.length - 1];
        $('#usd-balance').html(last.data.balance.usd);
        $('#btc-balance').html(last.data.balance.btc);
    }

    chart($('#chart'), data);
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

function chart(chart, data) {
    $.plot(chart, data, {
        series: {
            lines: { show: true, fill: false},
            points: { show: false}
        },
        grid: { color: 'transparent' },
        xaxis: {
            color: 'rgba(0, 0, 0, 0.5)',
            font: { color: 'black', family: 'sans-serif', size: 11},
            mode: 'time'
        },
        yaxis: {
            color: 'rgba(0, 0, 0, 0.5)',
            font: { color: 'black', family: 'sans-serif', size: 11}
        },
        colors: ['rgb(143, 198, 242)', 'rgb(242, 198, 143)']
    });
}