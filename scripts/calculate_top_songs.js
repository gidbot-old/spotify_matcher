var MongoClient = require('mongodb').MongoClient
, config = require('../config') 
, mongoUrl = config.mongo_url
, Twitter = require('twitter');


var SpotifyWebApi = require('spotify-web-api-node');
var clientId = 'a9b262c869aa4a9391f78deb6bc5af3d',
    clientSecret = '449989ef56f041ce98079391c1952bd2';

var spotifyApi = new SpotifyWebApi({
	  clientId : clientId, 
	  clientSecret: clientSecret	 
	});


var User = require('../models/user')
, mongoose = require('mongoose');


var twitterClient = new Twitter({
  consumer_key: config.twitter_consumer_key,
  consumer_secret: config.twitter_consumer_secret,
  access_token_key: config.twitter_access_token_key,
  access_token_secret: config.twitter_access_token_secret
});
 
var placement = [" "," 2nd "," 3rd "," 4th "," 5th "," 6th "," 7th "]; 
var topTracks;

function tweetTrack (callback) {
	var d = new Date();
	var n = d.getDay();
	n = (n < 1) ? 7: n-1; 
	var currentTrack = topTracks[n];
	var link = "https://open.spotify.com/track/" + currentTrack.spotify_id;
	var status = "Currently, the" +  placement[n] +'most popular track on Discover Weekly is "' + currentTrack.info.name + '" by ' + currentTrack.info.artist + ": "+ link; 

	twitterClient.post('statuses/update', {status: status},  function (error) {
		if (error) { 
			console.log(error);
		} else {
			console.log("Successfully Tweeted Track for n=" + n);
		}
		callback();
	});
}


var run = function () {
	mongoose.connect(config.mongo_url);

	var tracks = {}; 
	User.findOne({name: "Gideon Rosenthal"}, function (err, user) {		
		spotifyApi.setRefreshToken(user.spotify_refresh_token);
		spotifyApi.refreshAccessToken()
			.then(function (data) {
			console.log('The access token has been refreshed!');
			spotifyApi.setAccessToken(data.body['access_token']);
			User.find({}, function (err, users) {
				if (err) { 
					console.log(err);
				}
				var count = 0; 
				for (var j = 0; j < users.length; j++) {
					var playlist = users[j];
					if (playlist.tracks){
						var keys = Object.keys(playlist.tracks); 
						for (var i = 0; i < keys.length; i++) {
							count++;
							if (!tracks[keys[i]]) {
								tracks[keys[i]] = { 
									count: 0, 
									info: playlist.tracks[keys[i]]
								}; 
							} else {
								tracks[keys[i]].count = tracks[keys[i]].count + 1; 
							}
						}
					}
				}

				var toReturn = []; 
				var keys = Object.keys(tracks); 
				for (var i = 0; i < keys.length; i++) {
					if (tracks[keys[i]].count > 1) {
						toReturn.push({
							spotify_id: keys[i], 
							count: tracks[keys[i]].count,
							info: tracks[keys[i]].info
						});
					}
				};
				toReturn.sort(function (b, a) {
					return a.count - b.count; 
				}); 
				toReturn = toReturn.slice(0,30); 
				var count = 30; 
				var date = new Date(); 
				date.setDate(date.getDate()-7);
				var dateString = date.toDateString().replace(/\s/g, '-');
				dateString = dateString.replace('Sun-', ''); 
				dateString = dateString.replace('Mon-', ''); 
				var toSave = {
					date_added: new Date(),
					tracks: toReturn
				}
				var spotify_ids = [];
				for (var i = 0; i < toReturn.length; i++) {
					spotify_ids.push("spotify:track:" + toReturn[i].spotify_id);
				}
				topTracks = toSave.tracks; 
				MongoClient.connect(mongoUrl, function (err, db) {
					db.collection('top_tracks').insertOne(toSave, function (err) {
						db.close();
					
						spotifyApi.replaceTracksInPlaylist('gideonbrosenthal', '1wzJHLrmgKdcRyMcwdSrDL', spotify_ids)
						  .then(function(data) {
						  	console.log('Replaced Tracks in Playlist!');

						  	tweetTrack (function () {
							    console.log("Done with top tracks");
							    mongoose.connection.close();
						  	}); 

						  }, function(err) {
						    console.log('Something went wrong with replacing!', err);
						  });
					});
				});
				

			});

		  }, function (err) {
		    console.log('Could not refresh access token', err);
		  });

	});
	
}; 

run();

exports.run = run;
