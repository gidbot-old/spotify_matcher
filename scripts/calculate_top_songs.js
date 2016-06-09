var MongoClient = require('mongodb').MongoClient
, config = require('../config'); 
var mongoUrl = config.mongo_url;

var SpotifyWebApi = require('spotify-web-api-node');
var clientId = 'a9b262c869aa4a9391f78deb6bc5af3d',
    clientSecret = '449989ef56f041ce98079391c1952bd2';

var spotifyApi = new SpotifyWebApi({
	  clientId : clientId, 
	  clientSecret: clientSecret	 
	});


function calculateTop () {
	MongoClient.connect(mongoUrl, function (err, db) {
		if (err) {
			throw err;
		}
		var tracks = {}; 
		db.collection('users').findOne({name: "Gideon Rosenthal"}, function (err, user) {		
			spotifyApi.setRefreshToken(user.spotify_refresh_token);
			spotifyApi.refreshAccessToken()
				.then(function (data) {
				console.log('The access token has been refreshed!');
				spotifyApi.setAccessToken(data.body['access_token']);
				db.collection('users').find({}, function (err, cursor) {
					if (err) { 
						console.log(err);
					}
					var count = 0; 

					cursor.each(function(err, playlist) {
						if (playlist) {
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

						} else {
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
							db.collection('top_tracks').insertOne(toSave, function (err) {
								db.close();
						
								spotifyApi.replaceTracksInPlaylist('gideonbrosenthal', '1wzJHLrmgKdcRyMcwdSrDL', spotify_ids)
								  .then(function(data) {
								    console.log('Replaced Tracks in Playlist!');
								  }, function(err) {
								    console.log('Something went wrong with replacing!', err);
								  });
							});
						} 
					}); 

				});

			  }, function (err) {
			    console.log('Could not refresh access token', err);
			  });

		});
		
	}); 
}; 

calculateTop();
