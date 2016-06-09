var playlist = require('./billy_dw.json');
var MongoClient = require('mongodb').MongoClient;
// var mongoUrl = "mongodb://heroku_kcwwqdzc:bqha9i37286aljutbt43ft6vqp@ds039065-a0.mongolab.com:39065,ds039065-a1.mongolab.com:39065/heroku_kcwwqdzc?replicaSet=rs-ds039065";
var mongoUrl = "mongodb://gidbot:ttfbtb2404@candidate.37.mongolayer.com:11137,candidate.52.mongolayer.com:10829/spotify?replicaSet=set-5689c22023371e1d340008f6";

var items = playlist.items; 
var tracks = {};
var artists = {}; 

for (var i = 0; i < items.length; i++) {
	var item = items[i];
	tracks[item.track.id] = { 
		name: item.track.name, 
		artist: items[i].track.artists[0].name
	}
	artists[items[i].track.artists[0].id] = items[i].track.artists[0].name;  
}

MongoClient.connect(mongoUrl, function (err, db) {
	var user = {
		spotify_id: playlist.spotify_id,
		dw_spotify_id: playlist.dw_spotify_id,
		tracks: tracks, 
		artists: artists,
		sorted_tracks: Object.keys(tracks).sort(),
		sorted_artists: Object.keys(artists).sort(), 
		display_name: playlist.display_name,
		profile_pic: playlist.profile_pic,
		random: Math.random()
	}

	db.collection('users').insert(user, function (err, result) {
		if (err) {
			console.log(err); 
		}
		db.close();
	}); 
}); 
