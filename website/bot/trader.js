var token = window.location.href.split('token=')[1];

var mirror = null;
var settings = null;
var data = [
    [],
    []
];
var statistics = {};

var currentType = null;
var typeMessages = {
    'back': '<span class="glyphicon glyphicon-eye-open"></span> Back Test',
    'sim': '<span class="glyphicon glyphicon-flash"></span> Simulation',
    'live': '<span class="glyphicon glyphicon-usd"></span> Live'
};

var lastTime = 0;
var isRunning = false;

function reset() {
    data = [
        {data: [], label: 'Market', color: 'rgb(143, 198, 242)'},
        {data: [], label: 'Bot', color: 'rgb(242, 198, 143)'}
    ];
    lastTime = 0;
    $('#trans').empty();
    chart($('#performance'), data);
    $('#usd-balance').html('');
    $('#btc-balance').html('');
    $('.left').addClass('inactive');
    statistics = {};
    $('#statistics').empty();
}

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


    $('#trans-fee').val(settings.usdTransFee);
    $('#avg-spread').val(settings.usdSpread);
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

    settings.usdTransFee = parseFloat($('#trans-fee').val());
    settings.usdSpread = parseFloat($('#avg-spread').val());

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

            currentType = data.type;
            setRunning(true);

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

    var newData = false;

    for (var i = index; i < snapshots.length; ++i) {
        var s = snapshots[i];

        if (s.data.time < lastTime) continue;
        lastTime = s.data.time;

        if (s.data.orderResult) {
            addTransaction({
                type: s.data.orderResult.btcDelta > 0 ? 'BUY' : 'SELL',
                price: '$' + round(s.data.orderResult.realPrice, 3),
                btc: '฿' + round(Math.abs(s.data.orderResult.btcDelta), 5),
                time: new Date(s.data.time).toString()
            });
        }

        newData = true;

        data[0].data.push([s.data.time, s.stats._pricePerformance]);
        data[1].data.push([s.data.time, s.stats._balancePerformance]);

        for (var stat in s.stats) {
            if (stat.indexOf('_') == 0) {
                continue;
            }

            var value = s.stats[stat];
            if (typeof(value) !== 'object' && (typeof(value) !== 'number')) {
                continue;
            }

            if (!(stat in statistics)) {
                var el = document.createElement('div');
                el.id = 'chart-' + Math.random();
                el.className = 'chart';

                var ss = {
                    seriesKey: {},
                    series: [],
                    $element: $(el)
                };

                if (typeof(value) === 'object') {
                    for (var statKey in value) {
                        if (typeof(value[statKey]) !== 'number') continue;
                        ss.seriesKey[statKey] = ss.series.length;
                        ss.series.push({data:[], label: stat + '.' + statKey});
                    }
                } else {
                    ss.series = [{data:[], label: stat}];
                }

                statistics[stat] = ss;
                ss.$element.appendTo($('#statistics'));
            }

            if (typeof(value) === 'object') {
                for (var statKey in value) {
                    statistics[stat].series[statistics[stat].seriesKey[statKey]].data.push([
                        s.data.time,
                        value[statKey]
                    ]);
                }
            } else {
                statistics[stat].series[0].data.push([s.data.time, value]);
            }
        }
    }

    if (snapshots.length) {
        var last = snapshots[snapshots.length - 1];
        $('#usd-balance').html(round(last.data.balance.usd, 3));
        $('#btc-balance').html(round(last.data.balance.btc, 5));
        $('#usd-total-balance').html(round(last.data.balance.usd + last.data.balance.btc * last.data.price, 3));
    }

    if (newData) {
        chart($('#performance'), data);

        for (var stat in statistics) {
            var statData = statistics[stat];
            chart(statData.$element, statData.series);
        }
    }
}

function round(value, points) {
    var scale = Math.pow(10, points);
    return Math.round(value * scale) / scale;
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
        xaxis: {
            color: 'rgba(0, 0, 0, 0.5)',
            font: { color: 'black', family: 'sans-serif', size: 11},
            mode: 'time'
        },
        yaxis: {
            color: 'rgba(0, 0, 0, 0.5)',
            font: { color: 'black', family: 'sans-serif', size: 11}
        }
    });
}