var SpotifyWebApi = require('spotify-web-api-node');
var express = require('express');
var router = express.Router(); 
var config = require('../config');
var assert = require('assert');
var FB = require('fb');	

var facebook = 'facebook';
var spotify = 'spotify';


// Models 
var User = require('../models/user');
var FB_User = require('../models/fb_user');
var Match = require('../models/match');
var LastWeek = require('../models/last_week');
var TopList = require('../models/top_list');


var scopes = ['playlist-read-private', 'user-read-email', 'playlist-modify-public'],
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

function idExists (fb_id, service, callback) {
	User.findOne({facebook_id: fb_id}, function (err, result) {
		if (err) throw err;
		if (service == facebook) {
			if (result) {
				callback(result); 
			} else {
				FB_User.findOne({facebook_id: fb_id}, function (err, result) {
					callback(result); 
				}); 
			}
		} else {
			callback(result); 
		}
	 
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

router.get('/home', function (req, res){
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		Match.findOne({facebook_id: req.session.facebookId}, function (err, result) {
			res.render('home', 
  			{
  				users: (result) ? result.matches : null,
				currentDisplayName: req.session.name,
				currentFacebookId: req.session.facebookId
  			});
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

router.get('/', function (req, res) { 
	var status = {
		facebook: (!req.session.facebookId) ? false: true, 
		spotify: (!req.session.spotifyId) ? false: true
	}
	if (status.facebook && status.spotify) {
		res.redirect('/home');
	} else {
		res.render('login', status);
	}
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
		res.redirect('/login');
	}  else  {
		var code = req.query.code; 
		spotifyApi.authorizationCodeGrant(code)
		.then(function(data) {
			req.session.spotifyToken = data.body['access_token'];
			spotifyApi.setAccessToken(data.body['access_token']);
    		spotifyApi.setRefreshToken(data.body['refresh_token']);

			res.redirect('/select-playlist');
				
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
		idExists(req.body.authResponse.userID, facebook, function (doc){
			if (!doc){
				var new_user = new FB_User({facebook_id: req.body.authResponse.userID});
				new_user.save(function (err, result) {
					if (err) {
						res.status(500).send('Database Error');
					} else {
						req.session.facebookId = result.facebook_id; 
						idExists(result.facebook_id, spotify, function (result) {
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

router.get('/select-playlist', function (req, res) {
	if(!req.session.spotifyToken) {
		res.redirect('/login');
	} else {
		spotifyApi.getMe()
		.then(function (data) {
		 	return data.body.id;
		})
		.then(function (user_id) {
			return spotifyApi.getUserPlaylists(user_id, {limit:50});
		})
		.then(function (data) {
			var items = data.body.items; 
			var possible_playlists = []; 
		    for (var i = 0; i < items.length; i++) {
		    	if (items[i].owner.id == 'spotify') {
		    		var playlist = {
		    			id: items[i].id, 
		    			name: items[i].name,
		    			image: items[i].images[0].url
		    		}
		    		possible_playlists.push(playlist); 	    		
		    	}
		    }
		    if (possible_playlists.length < 1) {
		    	res.redirect('/no-playlists');
		    } else {
		    	res.render('select_playlist', {playlists: possible_playlists}); 		    	
		    }
		});
	}
});

router.get('/no-playlists', function (req, res) {
	res.render('no_playlists');
}); 

router.get('/select-playlist/:id', function (req, res) {
	if(!req.session.spotifyToken) {
		res.redirect('/login');
	} else {
		res.render('spotify_login', {token: req.session.spotifyToken, id: req.params.id}); 
	}
});

router.get('/spotify-login', function (req, res) {
	if(!req.session.spotifyToken) {
		res.redirect('/login');
	} else {
		res.render('spotify_login', {token: req.session.spotifyToken}); 
	}
}); 

router.post('/spotify-login', function (req, res) {
	if (!req.session.facebookId){
		res.status(401).send('Log in to Facebook First');
	} else if(!req.session.spotifyToken) {
		res.status(401).send('Log in to Spotify First');
	} else {
		var new_user = new User(req.body);
		new_user.spotify_refresh_token = spotifyApi.getRefreshToken();
		new_user.facebook_id = req.session.facebookId; 
		new_user.save(function (err, result) {
			if (err) {
				res.status(500).send('Database Error');
			} else {
				FB_User.remove({facebook_id: req.session.facebookId}, function (err){
					if (err) {
						console.log(err);
					}
				}); 
				req.session.spotifyId = req.body.spotify_id; 
				req.session.name = req.body.name;
				res.status(200).send('User Added');
			}
		}); 
	}
});

router.get('/user/:facebook_id', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login'); 
	} else {
		User.findOne({facebook_id: req.params.facebook_id}, function (err, user){
			if (!user) {
				FB_User.findOne({facebook_id: req.params.facebook_id}, function (err, fb_user) {
					if (!fb_user) { 
						res.redirect('/not-found');
					} else { 
						res.redirect('/user-incomplete');
					}
				}); 
			} else {
				Match.findOne({facebook_id: req.params.facebook_id}, function (err, result) {
					res.render('user', {
						otherDwId: user.dw_spotify_id,
						otherDisplayName: (user.name)? user.name: user.spotify_id,
						otherFacebookId: user.facebook_id, 
						currentFacebookId: req.session.facebookId, 
						otherSpotifyId: user.spotify_id, 
						users: (result) ? result.matches: null
					});
				});  
			}
		});
	}
});

router.get('/compare/:facebook_id/:second_id', function (req, res) {
	try {
		User.findOne({facebook_id: req.params.second_id}, function (err, user2){
			if (!user2) {
				res.redirect('/not-found');
			} else {
				
				User.findOne({facebook_id: req.params.facebook_id}, function (err, user){
					if (!user) {
						res.redirect('/not-found');
					} else {
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
							currentDwId: user.dw_spotify_id,
							otherDwId: user2.dw_spotify_id,
							currentDisplayName: (user.name)? user.name: user.spotify_id,
							otherDisplayName: (user2.name)? user2.name: user2.spotify_id,
							currentFacebookId: user.facebook_id,
							otherFacebookId: user2.facebook_id
						});
					}
				});
			}
		});
	} catch (e){
		res.redirect('/not-found');
	}


}); 

router.get('/best-match', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		FB.api('me/friends', 'get', {access_token: req.session.facebookToken, limit: 200},  function (fb_response) {
		  if(!fb_response || fb_response.error) {
		  		res.redirect('/logout');
		  } else {
		  	if (fb_response.data.length < 1) {
		  		res.render('add_friends');
		  	} else { 
		  		var fbIds = fb_response.data.map(function(response) {
				  return response.id;
				});
		  		discoverUsers(fbIds, req.session.spotifyId, function (facebook_id) {
					res.redirect(302, '/compare/'+ facebook_id);
				});
		  	}
		  }
		});
	}
}); 

router.get('/random', function (req, res) { 
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		FB.api('me/friends', 'get', {access_token: req.session.facebookToken, limit: 200},  function (fb_response) {
		  if(!fb_response || fb_response.error) {
		  	res.redirect('/logout');
		  } else {
		  	if (fb_response.data.length < 1) {
		  		res.render('add_friends');
		  	} else { 
		  		var index = Math.floor((Math.random() * (fb_response.data.length-1)));
		  		res.redirect(302, '/compare/' + req.session.facebookId +'/'+ fb_response.data[index].id);
		  	}
		  }
		});
	}
}); 

router.get('/friends', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		FB.api('me/friends', 'get', {access_token: req.session.facebookToken, limit: 100},  function (fb_response) {
		  if(!fb_response || fb_response.error) {
		  		res.redirect('/logout');
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
	User.find(
		{
			name: {$regex:search,  $options: 'i'},
			facebook_id:{$exists:true}
		},
		{facebook_id:1, name:1, spotify_id:1 },
		{limit: 10, offset:page}, function (err, users){
		callback(users);
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


router.get('/user-incomplete', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		res.render('user_incomplete');
	}
}); 

router.get('/not-found', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		res.status(404).render('not_found');
	}
}); 

router.get('/last-week/:facebook_id?', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		if (!req.params.facebook_id) {
			LastWeek.findOne({spotify_id: req.session.spotifyId}, function (err, playlist) {
				res.render('last_week', {playlist: playlist, username: 'Your'});
			}); 	
		} else {
			User.findOne({facebook_id: req.params.facebook_id}, function (err, user){
				if (!user) {
					res.redirect('/not-found');	
				} else {
					LastWeek.findOne({spotify_id: user.spotify_id}, function (err, playlist) {
						res.render('last_week', {playlist: playlist, username: user.name.split(' ')[0]+"'s"});
					}); 	
				}
			});
		}
	}
}); 


router.get('/about', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		res.render('about');
	}
});

router.get('/invite', function (req, res) {
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		res.render('add_friends');
	}
});

var discoverUsers = function(fbIds, currentId, callback) {
	var artistsMax = -1;
	var tracksMax = -1; 
	var match = false; 
	User.findOne({spotify_id: currentId}, function(err, currentUser) {
		var findJson = {
			tracks:{'$exists':true}, 
			facebook_id:{'$in':fbIds}, 
			spotify_id: {"$ne": currentUser.spotify_id}
		}
		User.find(findJson, function (err, users) {
			users.forEach(function (user2) {
			    var tracksInCommon = getIntersection(currentUser.sorted_tracks, user2.sorted_tracks);
			    if (tracksInCommon.length >= tracksMax) {
			    	var artistsInCommon = getIntersection(currentUser.sorted_artists, user2.sorted_artists); 
			    	if (tracksInCommon.length > tracksMax || (tracksInCommon.length == tracksMax && artistsInCommon.length > artistsMax)){
				    	tracksMax = tracksInCommon.length; 
				    	artistsMax = artistsInCommon.length;
				    	match = user2.facebook_id;
				    }
			    } 
		  	});
		  	callback(match);
		});
	});

};

// Top Tracks
router.get('/top-tracks', function (req, res) {
	TopList.findOne({}, {}, { sort: { 'date_added' : -1 } }, function(err, list) {
  		res.render('top_list', {
  			tracks: list.tracks 
  		}); 
	});
}); 

// Matches
router.post('/get-matches', function (req, res) { 
	if (!req.session.facebookId || !req.session.spotifyId) {
		res.redirect('/login');
	} else {
		discoverMatches(req.session.spotifyId, function (connections){
			var options = {
				upsert: true
			}
			connections.sort(function(a, b) {
			    return b.total - a.total;
			});
			var setJson = {
				facebook_id: req.session.facebookId, 
				spotify_id: req.session.spotifyId, 
				matches: connections.slice(0, 12)
			}

			var new_match = new Match(setJson); 
			new_match.save(function (err) {
				if (err) {
					res.status(500).send('Server Error');
				} else {
					res.status(200).send('Matches Added');
				}
			}); 
		});
		
	}
}); 

var discoverMatches = function(currentId, callback) {
	var matches = []; 
	User.findOne({spotify_id: currentId}, function(err, currentUser) {
		if (err) { 
			console.log(err);
		}
		var findJson = {
			spotify_id: {"$ne": currentUser.spotify_id}
		}
		User.find(findJson, function (err, users) {
			if (err) {
				console.log(err);
			}
			users.forEach(function (user2) {			
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
		    		}
			    }   
		  	});
		  	callback(matches);
		});
	});
};

module.exports = router;
