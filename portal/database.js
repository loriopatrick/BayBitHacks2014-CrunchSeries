var MongoClient = require('mongodb').MongoClient;
var settings = require('./settings');

MongoClient.connect(settings.MONGO_PATH, function (err, db) {
    if (err) throw err;
    exports.mongo = db;
});

exports.mongo = null;