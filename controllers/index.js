var SpotifyWebApi = require('spotify-web-api-node');
var express = require('express');
var router = express.Router(); 
var MongoClient = require('mongodb').MongoClient;
var config = require('../config');
var mongoUrl = config.mongo_url;
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');
var FB = require('fb');	

var facebook = 'facebook';
var spotify = 'spotify';

var scopes = ['playlist-read-private', 'user-read-email'],
    redirectUri = config.spotify_redirect,
    clientId = 'a9b262c869aa4a9391f78deb6bc5af3d',
    clientSecret = '449989ef56f041ce98079391c1952bd2',
    state = 'login';

	var spotifyApi = new SpotifyWebApi({
	  redirectUri : redirectUri,
	  clientId : clientId, 
	  clientSecret: clientSecret, 
	  authorize_params: {
        show_dialog: 'true'
      }
	});

function previousSpotify (token, callback) {
	spotifyApi.setAccessToken(token); 
	spotifyApi.getMe()
	  .then(function(data) {
	    MongoClient.connect(mongoUrl, function (err, db) {
	    	db.collection('users').findOne({spotify_id: data.body.id}, function (err, result) {
	    		db.close();
	    		var toReturn = (!result) ? false : result;
	    		callback(toReturn);
	    	}); 
	    });
	  }, function(err) {
	  		callback(false);
	  });
}


function idExists (fb_id, service, callback) {
	MongoClient.connect(mongoUrl, function (err, db) {
    	db.collection('users').findOne({facebook_id: fb_id}, function (err, result) {
    		if (service == facebook) {
				var toReturn = (!result) ? false : result;

				if (toReturn) {
					db.close();
					callback(result); 
				} else {
					db.collection('fb_users').findOne({facebook_id: fb_id}, function (err, result) {
						db.close();
						var toReturn = (!result) ? false : result;
						callback(result); 
					});
				}
    		} else {
    			db.close();
    			var toReturn = (!result)? false : result;
    			callback(result); 
    		}
    	}); 
    });
}

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

router.get('/', function (req, res){
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		FB.api('me/friends', 'get', {limit: 30},  function (fb_response) {
		  if(!fb_response || fb_response.error) {
		    res.status(500).send('Facebook Error');	
			} else {
		  		res.render('home', 
		  			{
		  				users: fb_response.data,
						currentDisplayName: req.session.name,
						currentFacebookId: req.session.facebookId
		  			});
		  	}
		});
	}
}); 

router.get('/logout', function (req, res) { 
	req.session.facebookId = false; 
	req.session.spotifyId = false; 
	req.session.name = false; 
	req.session.facebookToken = false;
	res.redirect('/login');
}); 

router.get('/login', function (req, res) {  
	res.render('login', {
		facebook: (!req.session.facebookId) ? false: true, 
		spotify: (!req.session.spotifyId) ? false: true
	});
}); 

router.get('/auth/spotify', function (req, res) {
	if (!req.session.facebookId) {
		res.redirect('/login');
	} else {
		var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
		res.redirect(authorizeURL + "&show_dialog=true");
	}
	
});

router.get('/auth/spotify/callback', function (req, res){
	if (!req.session.facebookId || (req.session.facebookId && req.session.spotifyId)) {
		res.direct('/');
	}  else  {
		var code = req.query.code; 
		spotifyApi.authorizationCodeGrant(code)
		.then(function(data) {
			req.session.spotifyToken = data.body['access_token'];
			spotifyApi.setAccessToken(data.body['access_token']);
    		spotifyApi.setRefreshToken(data.body['refresh_token']);
			
			previousSpotify(data.body['access_token'], function (result) {
				if (!result) {
					res.redirect(302, '/spotify-login'); 
				} else {
					MongoClient.connect(mongoUrl, function (err, db) {
						db.collection('fb_users').deleteOne({facebook_id: req.session.facebookId}, function (err){
							db.collection('users').update({spotify_id: result.spotify_id}, {$set:{facebook_id:req.session.facebookId}}, function (err, response) {
								db.close();
								req.session.spotifyId = result.spotify_id; 
								req.session.name = result.name;
								res.redirect(302, '/login'); 
							});
						}); 
					});
				}
			}); 

		}, function (err) {
			res.redirect('/login');
		});
	}

});

router.post('/facebook-login', function (req, res) {
	if (!req.body.authResponse) {
		res.status(401).send({login: 'rejected'});
	} else {
		req.session.facebookToken = req.body.authResponse.accessToken;
		FB.setAccessToken(req.body.authResponse.accessToken);

		idExists(req.body.authResponse.userID, facebook, function (doc){
			if (!doc){
				MongoClient.connect(mongoUrl, function (err, db) {
					if (err) { 
						res.status(500).send('Database Error');
					}
					db.collection('fb_users').insertOne({facebook_id: req.body.authResponse.userID}, function (err, result) {
						db.close();
						if (err) {
							res.status(500).send('Database Error');
						} else {
							req.session.facebookId = result.ops[0].facebook_id; 
							idExists(result.ops[0].facebook_id, spotify, function (result) {
								if (result) {
									req.session.spotifyId = result.spotifyId; 
									req.session.name = result.name;
									res.status(200).send({spotify:true});
								} else {
									res.status(200).send({spotify:false});
								}
							});
						}
					}); 
				}); 
			} else {
				req.session.facebookId = req.body.authResponse.userID; 
				if (doc.spotify_id) {
					req.session.spotifyId = doc.spotify_id; 
					req.session.name = doc.name;
					res.status(200).send({facebook:true, spotify:true});
				} else{ 
					res.status(200).send({facebook:true, spotify:false});
				}
			}
		}); 

	}
});

router.get('/spotify-login', function (req, res) {
	if(!req.session.spotifyToken) {
		res.redirect('/login');
	} else {
		res.render('spotify-login', {token: req.session.spotifyToken}); 
	}
}); 

router.post('/spotify-login', function (req, res) {
	if (!req.session.facebookId){
		res.status(401).send('Log in to Facebook First');
	} else if(!req.session.spotifyToken) {
		res.status(401).send('Log in to Spotify First');
	} else {
		MongoClient.connect(mongoUrl, function (err, db) {
			if (err) { 
				res.status(500).send('Database Error');
			}

			req.body["facebook_id"] = req.session.facebookId;
			db.collection('users').insertOne(req.body, function (err, result) {
				if (err) {
					db.close();
					res.status(500).send('Database Error');
				} else {
					db.collection('fb_users').deleteOne({facebook_id: req.session.facebookId}, function(){
						db.close();
					}); 
					req.session.spotifyId = req.body.spotify_id; 
					req.session.name = req.body.name;
					res.status(200).send('User Added');
				}
			}); 
		}); 
	}
});

router.get('/compare/:facebook_id', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login'); 
	} else {
		MongoClient.connect(mongoUrl, function (err, db) { 
			try {
				db.collection('users').findOne({facebook_id: req.params.facebook_id}, function (err, user){
					if (!user) {
						db.close();
						res.redirect('/not-found');
					}
					db.collection('users').findOne({facebook_id: req.session.facebookId}, function (err, user2){
						db.close();
						var artistsInCommon = getIntersection(user.sorted_artists, user2.sorted_artists);
						var tracksInCommon = getIntersection(user.sorted_tracks, user2.sorted_tracks);
						var artists = {};
						var tracks = {};
						for (var i = 0; i < artistsInCommon.length; i++){
							artists[artistsInCommon[i]] = user2.artists[artistsInCommon[i]];
						}
						for (var i = 0; i < tracksInCommon.length; i++){
							tracks[tracksInCommon[i]] = user2.tracks[tracksInCommon[i]];
						}
						var percent = ((tracksInCommon.length + artistsInCommon.length)/60*100).toFixed(2); 
						res.render('compare', {
							percent: percent,  
							tracks: tracks, 
							artists: artists, 
							currentDwId: user2.dw_spotify_id,
							otherDwId: user.dw_spotify_id,
							currentDisplayName: (user2.name)? user2.name: user2.spotify_id,
							otherDisplayName: (user.name)? user.name: user.spotify_id,
							currentFacebookId: user2.facebook_id,
							otherFacebookId: user.facebook_id
						});

					});
				});
			} catch (e){
				db.close();
				res.redirect('/not-found');
			}
		});
	}

}); 

router.get('/best-match', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		MongoClient.connect(mongoUrl, function (err, db) {
			assert.equal(null, err);
			FB.api('me/friends', 'get', {limit: 200},  function (fb_response) {
			  if(!fb_response || fb_response.error) {
			    res.status(500).send('Facebook Error');
			  } else {
			  	if (fb_response.data.length < 1) {
			  		res.render('add_friends');
			  	} else { 
			  		var fbIds = fb_response.data.map(function(response) {
					  return response.id;
					});
			  		discoverUsers(fbIds, req.session.spotifyId, db, function (facebook_id) {
						db.close();
						res.redirect(302, '/compare/'+ facebook_id);
					});
			  	}
			  }
			});

		});
	}
}); 

router.get('/random', function (req, res) { 
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		FB.api('me/friends', 'get', {limit: 200},  function (fb_response) {
		  if(!fb_response || fb_response.error) {
		    res.status(500).send('Facebook Error');
		  } else {
		  	if (fb_response.data.length < 1) {
		  		res.render('add_friends');
		  	} else { 
		  		var index = Math.floor((Math.random() * (fb_response.data.length-1)));
		  		res.redirect(302, '/compare/'+ fb_response.data[index].id);
		  	}
		  }
		});
	}
}); 

router.get('/friends', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		FB.api('me/friends', 'get', {limit: 30},  function (fb_response) {
		  if(!fb_response || fb_response.error) {
		    
		    res.status(500).send('Facebook Error');
			
			} else {
		  		if (fb_response.data.length < 1) {
		  			res.render('add_friends');
		  		} else { 
		  			res.render('search', {title: 'Friends', users: fb_response.data});
		  		}
		  	}
		});
	}
});

function searchUsers (search, page, callback) { 
	page = parseInt(page);
	if (!page || isNaN(page)) {
		page = 0; 
	}
	MongoClient.connect(mongoUrl, function (err, db) {
		db.collection('users').find(
			{
				name: {$regex:search,  $options: 'i'},
				facebook_id:{$exists:true}
			},
			{facebook_id:1, name:1},
			{limit: 10, offset:page}).toArray(function (err, users){

			db.close(); 
			callback(users);

		});
	});
}

function getSearch (req, res) {
	if (!req.session.facebookId) { 
		res.redirect('/login');
	} else if (req.query.q) { 
		searchUsers(req.query.q, req.query.page, function (users){
			res.render('search', {users: req.users});
		});
	} else {
		res.render('search', {title: 'Users', users: req.users});
	}
}
router.get('/search', getSearch); 

router.post('/search', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		searchUsers(req.body.search, req.query.page, function (users){
			req.users = users; 
			getSearch(req, res);
		});
	}
}); 

router.get('/add-friends', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		res.render('add_friends');
	}
}); 


router.get('/not-found', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		res.status(404).render('not_found');
	}
}); 


router.get('/about', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		res.render('about');
	}
});

var discoverUsers = function(fbIds, currentId, db, callback) {
	var artistsMax = -1;
	var tracksMax = -1; 
	var match = false; 
	var collection = db.collection('users');	
	collection.findOne({spotify_id: currentId}, function(err, currentUser) {
		var findJson = {
			tracks:{'$exists':true}, 
			facebook_id:{'$in':fbIds}, 
			spotify_id: {"$ne": currentUser.spotify_id}
		}
		var cursor = collection.find(findJson);
		cursor.each(function(err, user2) {
		  if (user2 != null && currentUser.spotify_id != user2.spotify_id) {
		    var tracksInCommon = getIntersection(currentUser.sorted_tracks, user2.sorted_tracks);
		    if (tracksInCommon.length >= tracksMax) {
		    	var artistsInCommon = getIntersection(currentUser.sorted_artists, user2.sorted_artists); 
		    	if (tracksInCommon.length > tracksMax || (tracksInCommon.length == tracksMax && artistsInCommon.length > artistsMax)){
			    	tracksMax = tracksInCommon.length; 
			    	artistsMax = artistsInCommon.length;
			    	match = user2.facebook_id;
			    }
		    } 
		  } else {
		  	callback(match); 
		  } 
		});
	});

};

module.exports = router;
