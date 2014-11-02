var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var database = require('./database');
var settings = require('./settings');

var app = express();

app.use('/', express.static(path.join(__dirname, '../website')));
app.use(bodyParser.json());

require('./auth')(app);
require('./account')(app);
require('./bots')(app);

app.listen(settings.PUBLIC_PORT);