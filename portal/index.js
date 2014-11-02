var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var database = require('./database');

var app = express();

app.use('/', express.static(path.join(__dirname, '../website')));
app.use(bodyParser.json());

require('./auth')(app);
require('./account')(app);
require('./bots')(app);

app.listen(5050);