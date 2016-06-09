var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var mongoUrl = "mongodb://localhost:27017/spotify";


function intersect (array1, array2) {
	var inCommon = [];
	var totalRuns = 0; 
	var skip = 0;
	var totalRuns = 0; 
	var startJ = 0; 
	for (var i = 0; i < array1.length; i++) {
		for (var j = startJ; j < array2.length; j++) {
			totalRuns++;
			if (array1[i] == array2[j]) {
				inCommon.push(array1[i]);
				startJ = j;
				break;
			}
			if (array1[i] < array2[j]) {
				skip++;
				startJ = j; 
				break;
			}
		}
	}
	console.log('Skipped: ' + skip);
	console.log('TotalRuns: ' +totalRuns);
	return inCommon;
}
// var id = "56818c4e96ffce9427e9502d";
var id = "5681597be07b87ec2530f74a";
// var id = "56815970f801daea25651181";
MongoClient.connect(mongoUrl, function (err, db) {
	db.collection('users').findOne({_id:new ObjectID(id)}, function (err, user){
		if (err) {console.log(err);}
		db.collection('users').findOne({_id:new ObjectID("5681597be07b87ec2530f74a")}, function (err, user2){
			var artistsInCommon = intersect(user.sorted_artists, user2.sorted_artists);
			var tracksInCommon = intersect(user.sorted_tracks, user2.sorted_tracks);
			console.log('Num Artists: ' , artistsInCommon.length);
			console.log('Num Tracks: ' , tracksInCommon.length);
			for (var i = 0; i < artistsInCommon.length; i++){
				console.log(user2.artists[artistsInCommon[i]]);
			}
			for (var i = 0; i < tracksInCommon.length; i++){
				console.log(user2.tracks[tracksInCommon[i]]);
			}
			db.close();
		});
	});
}); 

