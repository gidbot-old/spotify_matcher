var SpotifyWebApi = require('spotify-web-api-node');
var express = require('express');
var router = express.Router(); 
var MongoClient = require('mongodb').MongoClient;
var mongoUrl = "mongodb://localhost:27017/spotify";

var scopes = ['playlist-read-private', 'playlist-modify-private'],
    redirectUri = 'http://localhost:3000/auth/spotify/callback',
    clientId = 'a9b262c869aa4a9391f78deb6bc5af3d',
    clientSecret = '449989ef56f041ce98079391c1952bd2',
    state = 'login';

	var spotifyApi = new SpotifyWebApi({
	  redirectUri : redirectUri,
	  clientId : clientId, 
	  clientSecret: clientSecret
	});

function userExists (token, callback) {
	spotifyApi.setAccessToken(token); 
	spotifyApi.getMe()
	  .then(function(data) {
	    MongoClient.connect(mongoUrl, function (err, db) {
	    	db.collection('users').findOne({spotify_id: data.body.id}, function (err, result) {
	    		db.close();
	    		var toReturn = (!result) ? false : result._id.toString();
	    		callback(toReturn);
	    	}); 
	    });
	  }, function(err) {
	  		callback(false);
	  });
}

function getIntersection (array1, array2) {
	var inCommon = [];
	for (var i = 0; i < array1.length; i++) {
		for (var j = 0; j < array2.length; j++) {
			if (array1[i] == array2[j]) {
				inCommon.push(array1[i]);
				continue;
			}
			if (array1[i] > array2[j]) {
				continue;
			}
		}
	}
	return inCommon;
}

router.get('/home', function (req, res) {
	if (!req.session.userId) {
		res.send('You must login first');
	} else { 
		res.send('User Logged-in');
	}
}); 

router.get('/login', function (req, res) {
	var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
	res.redirect(authorizeURL);
});

router.get('/auth/spotify/callback', function (req, res){
	var code = req.query.code; 
	spotifyApi.authorizationCodeGrant(code)
		.then(function(data) {
			req.session.token = data.body['access_token']; 
			userExists(data.body['access_token'], function (id) {
				if (!id) {
					res.redirect(302, '/add-user'); 
				} else {
					req.session.userId = id; 
					res.redirect(302, '/home');
				}
			}); 

		}, function (err) {
			res.send('Error Loggin In');
		});
});

router.get('/add-user', function (req, res) {
	if(!req.session.token) {
		res.redirect('/login');
	}
	res.render('login', {token: req.session.token}); 
}); 

router.post('/add-user', function (req, res) {
	MongoClient.connect(mongoUrl, function (err, db) {
		if (err) { 
			res.status(500).send('Database Error');
		}
		db.collection('users').insertOne(req.body, function (err, result) {
			db.close();
			if (err) {
				res.status(500).send('Database Error');
			} else {
				req.session.userId = result.ops[0]._id; 
				res.status(201).send(result.ops[0]._id);
			}
		}); 
	}); 
});

router.get('/compare/:uid', function (req, res) {



}); 

module.exports = router;
