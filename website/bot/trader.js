var token = window.location.href.split('token=')[1];

var mirror = null;
var settings = null;
var data = [
    [],
    []
];

var currentType = null;
var typeMessages = {
    'back': '<span class="glyphicon glyphicon-eye-open"></span> Back Test',
    'sim': '<span class="glyphicon glyphicon-flash"></span> Simulation',
    'live': '<span class="glyphicon glyphicon-usd"></span> Live'
};

var lastTime = 0;
var isRunning = false;

$(function () {
    $.get('/api/account?token=' + token, function (account) {
        settings = account.settings;
        renderSettings();

        mirror = CodeMirror($('#code').get(0), {
            value: account.code,
            mode: 'javascript',
            viewportMargin: Infinity,
            lineWrapping: true
        });

        reset();
        pollData(); // tie into any current running bots
    });
});

function renderSettings() {
    function formatDate(date) {
        date = new Date(date);
        function addZeros(value, minSize) {
            value = '' + value;
            while (value.length < minSize) {
                value = '0' + minSize;
            }
            return value;
        }

        return date.getFullYear() + '/' + addZeros(date.getMonth() + 1, 2) + '/' + addZeros(date.getDate());
    }

    $('#start-usd').val(settings.init.usd);
    $('#start-btc').val(settings.init.btc);

    $('#from-date').val(formatDate(settings.testRange.from));
    $('#to-date').val(formatDate(settings.testRange.to));
    $('#update-interval').val(settings.updateInterval);
}

function updateSettings() {
    function extractDate(str) {
        var parts = str.split('/');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
    }

    settings.init.usd = parseFloat($('#start-usd').val());
    settings.init.btc = parseFloat($('#start-btc').val());

    settings.testRange.from = extractDate($('#from-date').val());
    settings.testRange.to = extractDate($('#to-date').val());
    settings.updateInterval = parseInt($('#update-interval').val());

    $.ajax({
        type: 'POST',
        url: '/api/settings?token=' + token,
        data: JSON.stringify(settings),
        contentType: 'application/json; charset=utf-8'
    });
}

function openSettings() {
    $('#settings').modal();
}

function simulate() {
    if (isRunning) return alert('Only one bot a time');
    run('sim');
}

function backTest() {
    if (isRunning) return alert('Only one bot a time');
    run('back');
}

function liveTrade() {
    if (isRunning) return alert('Only one bot a time');
    alert('not yet implemented');
}

function stop() {
    $.post('/api/bot/stop?token=' + token);
}

function run(type) {
    reset();
    $.ajax({
        type: 'POST',
        url: '/api/code?token=' + token,
        data: JSON.stringify({code: mirror.getValue()}),
        contentType: 'application/json; charset=utf-8',
        success: function () {
            console.log('updated code', arguments);

            $.ajax({
                type: 'POST',
                url: '/api/run?type=' + type + '&token=' + token,
                success: function () {
                    console.log('started', arguments);
                    pollData();
                }
            });
        }
    });
}

function reset() {
    data = [
        [],
        []
    ];
    lastTime = 0;
    $('#trans').empty();
    chart($('#chart'), data);
    $('#usd-balance').html('');
    $('#btc-balance').html('');
    $('.left').addClass('inactive');
}

function renderRunningControls() {
    $('.header').addClass('running');
}

function renderNonRunningControls() {
    $('.header').removeClass('running');
    $('#running-type').html(typeMessages[currentType]);
}

function setRunning(running) {
    if (!isRunning && running) {
        renderRunningControls();
    } else if (isRunning && !running) {
        renderNonRunningControls();
    }
    isRunning = running;
}

function pollData() {
    var currentIndex = 0;
    var interval = setInterval(function () {
        $.get('/api/bot/snapshots?token=' + token, function (data) {
            if (data === 'no bot') {
                setRunning(false);
                return clearInterval(interval);
            }

            if (data === 'bad bot') {
                setRunning(false);
                alert('There is an error in your bot');
                return clearInterval(interval);
            }

            if (!data.running && isRunning) {
                clearInterval(interval);
            }

            currentType = data.type;
            setRunning(data.running);

            if (data.snapshots.length > currentIndex) {
                updateData(data.snapshots, currentIndex);
                currentIndex = data.snapshots.length;
            }
        });
    }, 500);
}

function updateData(snapshots, index) {
    if (index == -1) return;

    $('.left').removeClass('inactive');

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
}

function chart(chart, data) {
    if (!chart || !chart.length || !data) return;
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