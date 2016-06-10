var MongoClient = require('mongodb').MongoClient
, config = require('../config') 
, mongoUrl = config.mongo_url
, mongoose = require('mongoose')
, calculateTopSongs = require('./calculate_top_songs');

var User = require('../models/user');
var LastWeek = require('../models/last_week');
var Match = require('../models/match');

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
	console.log(currentId);
	User.findOne({spotify_id: currentId}, function (err, currentUser) {
		if (err) {
			console.log(err);
		}
		var findJson = {
			tracks:{'$exists':true}, 
			spotify_id: {"$ne": currentUser.spotify_id}
		}
		User.find(findJson, function (err, users) {
			for (var i = 0; i < users.length; i++) {

				var user2 = users[i];						
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
			add_connections(currentUser.facebook_id, currentUser.spotify_id, matches, function (){
				callback();
			});	
		});
	});
};


var add_connections = function (facebook_id, spotify_id, connections, callback) {
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
	Match.update({spotify_id: spotify_id}, setJson, options, function (err) {
		if (err) {console.log(err);}
		callback();
	}); 
}


var run = function () {
	mongoose.connect(config.mongo_url);
	User.find({}, function (err, users) {
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
					console.log('Matches Completed');
					console.log(highScore);
					mongoose.connection.close( function () {
						calculateTopSongs.run();
					});

				}
			});
			
		}
		runScript(0);
	}); 
}

exports.run = run;

