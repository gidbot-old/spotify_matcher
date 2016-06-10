var MongoClient = require('mongodb').MongoClient
, config = require('../config') 
, mongoUrl = config.mongo_url
, mongoose = require('mongoose')
, findMatches = require('./find_matches');

var SpotifyWebApi = require('spotify-web-api-node');
var clientId = 'a9b262c869aa4a9391f78deb6bc5af3d',
    clientSecret = '449989ef56f041ce98079391c1952bd2';

var spotifyApi = new SpotifyWebApi({
	  clientId : clientId, 
	  clientSecret: clientSecret	 
	});


var User = require('../models/user');
var LastWeek = require('../models/last_week');

var updateBatch = function (limit, offset) {
	User.find().limit(limit).skip(offset).exec(function (err, users) {
		var num = users.length;
		for (var i = 0; i < users.length; i++) {
			saveLastWeek (users[i], function (user){
				updatePlaylist(user.spotify_id, user.dw_spotify_id, function () {
					num--;
					if (num < 1) {
						console.log('Playlist Batch Updated'); 
						if (users.length >= limit) {
							updateBatch(limit, users.length);
						} else {
							mongoose.connection.close(function () {
								findMatches.run();
							});
							console.log("All Playlists Have Been Updated");
						}
					} 
				});
			});
		}
	})
}

var runUpdate = function () {
	User.findOne({name: "Gideon Rosenthal"}, function (err, user) {		
		spotifyApi.setRefreshToken(user.spotify_refresh_token);
		spotifyApi.refreshAccessToken()
			.then(function (data) {
				console.log("Spotify Token Updated");
				spotifyApi.setAccessToken(data.body['access_token']);
				updateBatch(50, 0); 

			}, function (err) {
		    	console.log('Could not refresh access token', err);
		});
	});
}


function saveLastWeek (user, callback) {
	var options = {
		upsert: true
	}
	var setJson = {
		spotify_id: user.spotify_id, 
		tracks: user.tracks,
		facebook_id: user.facebook_id
	}
	User.update({spotify_id: user.spotify_id}, setJson, options, function (err) {
		callback(user);
	}); 
}

function updatePlaylist (spotify_id, playlist_id, callback) {
	var tracks = {};
	var artists = {}; 
	spotifyApi.getPlaylistTracks('spotifydiscover', playlist_id)
	.then(function (data) {
		for (var i = 0; i < data.body.items.length; i++) {
			var item = data.body.items[i];
			tracks[item.track.id] = { 
				name: item.track.name, 
				artist: item.track.artists[0].name,
				artist_id: item.track.artists[0].id
			}
			artists[item.track.artists[0].id] = item.track.artists[0].name;  
		}
	})
	.then(function () {
		var setJson = {
			 $set: {
				tracks: tracks, 
				artists: artists,
				sorted_tracks: Object.keys(tracks).sort(),
				sorted_artists: Object.keys(artists).sort()
			}
		}
		User.update({spotify_id: spotify_id}, setJson, function (err) {
			if (err) {
				console.log(err);
			}
			callback();
		}); 

	}, function(err) {
		console.log("Error W/ Spotify API");
		console.log(err);
	});
}


var d = new Date();
var n = d.getDay();
if (n == 1) {
	mongoose.connect(config.mongo_url);
	runUpdate();
} else {
	console.log("Not Monday. Just Update Matches and Top Songs");
	findMatches.run();
}

