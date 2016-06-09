var MongoClient = require('mongodb').MongoClient;
var mongoUrl = "mongodb://gidbot:ttfbtb2404@candidate.37.mongolayer.com:11137,candidate.52.mongolayer.com:10829/spotify?replicaSet=set-5689c22023371e1d340008f6";
// var User = require('./website/models/user');
// var mongoose = require('mongoose');


function getIntersection (array1, array2) {
	var inCommon = [];	
	var startJ = 0; 
	for (var i = 0; i < array1.length; i++) {
		for (var j = startJ; j < array2.length; j++) {
			if (array1[i] == array2[j]) {
				inCommon.push(array1[i]);
				startJ = j;
				break;
			}
			if (array1[i] < array2[j]) {
				startJ = j; 
				break;
			}
		}
	}
	
	return inCommon;
}

var highScore = 0;

var discoverUsers = function(currentId, callback) {
	var matches = []; 
	var min = 0; 
	var max = 0;
	MongoClient.connect(mongoUrl, function (err, db) {
		if (err) {
			throw err;
		}
		db.collection('users').findOne({spotify_id: currentId}, function(err, currentUser) {
			if (err) { 
				console.log(err);
			}
			var findJson = {
				tracks:{'$exists':true}, 
				spotify_id: {"$ne": currentUser.spotify_id}
			}
			db.collection('users').find(findJson, function (err, cursor) {
				if (err) { 
					console.log(err);
				}
				cursor.each(function(err, user2) {
					if(user2  === null) {
						db.close();
						add_connections(currentUser.facebook_id, currentUser.spotify_id, matches, function (){
							callback();
						});
					} else {					
					    var tracksInCommon = getIntersection(currentUser.sorted_tracks, user2.sorted_tracks);
				    	var artistsInCommon = getIntersection(currentUser.sorted_artists, user2.sorted_artists);
				    	var total = artistsInCommon.length + tracksInCommon.length;
				    	if (total > 1) {
				    		if (user2.facebook_id) { 
				    			var match = {
				    				facebook_id: user2.facebook_id,
				    				spotify_id: user2.spotify_id,
				    				total: total, 
				    				name: (user2.name.length > 0) ? user2.name: user2.spotify_id
				    			}
				    			matches.push(match);
				    			if (total > highScore) { 
				    				highScore = total;
				    			}
				    		}
					    }   
					}
			  	});
			});
		});
	});
};

var add_connections = function (facebook_id, spotify_id, connections, callback) {
	MongoClient.connect(mongoUrl, function (err, db) {
		var options = {
			upsert: true
		}

		connections.sort(function(a, b) {
		    return b.total - a.total;
		});

		var setJson = {
			facebook_id: facebook_id, 
			spotify_id: spotify_id,
			matches: connections.slice(0, 12)
		}
		console.log(spotify_id);
		db.collection('matches').update({spotify_id: spotify_id}, setJson, options, function (err) {
			if (err) {console.log(err);}
			db.close();
			callback();
		}); 
	});	
}

MongoClient.connect(mongoUrl, function (err, db) {
	db.collection('users').find({}).toArray(function (err, users) {
		if (err) {
			console.log(err);
		}
		function runScript (i) {
			console.log(i);
			var user = users[i];
			discoverUsers(user.spotify_id, function () {
				i = i+1;
				if (i < users.length) {
					runScript(i)
				} else {
					console.log('Done');
					console.log(highScore);
					db.close();
				}
			});
			
		}
		runScript(0);
	}); 

});
