var MongoClient = require('mongodb').MongoClient;
var mongoUrl = "mongodb://gidbot:ttfbtb2404@candidate.37.mongolayer.com:11137,candidate.52.mongolayer.com:10829/spotify?replicaSet=set-5689c22023371e1d340008f6";


MongoClient.connect(mongoUrl, function (err, db) {
	db.collection('users').remove({facebook_id: {$exists:false}}).toArray(function (err, results) {
		console.log(results);
		db.close();
	});
});