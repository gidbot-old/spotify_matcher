var MongoClient = require('mongodb').MongoClient;
var mongoUrl = "mongodb://gidbot:ttfbtb2404@candidate.37.mongolayer.com:11137,candidate.52.mongolayer.com:10829/spotify?replicaSet=set-5689c22023371e1d340008f6";

MongoClient.connect(mongoUrl, function (err, db) {
	if (err) {
		throw err;
	}
	db.collection('matches').find({}).toArray(function (err, matches) {
		var high = 0; 
		var best = "";
		
		for (var i = 0; i < matches.length; i++) { 
			if (matches[i].matches[0]) {
				if (matches[i].matches[0].total > high) { 
					best = matches[i].matches[0];
					high = best.total;
				}
			}
		}

		db.close();
		console.log("Top: " , best);
	});
});
