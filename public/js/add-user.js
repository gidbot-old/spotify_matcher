$(function() {

	var spotifyApi = new SpotifyWebApi();
	spotifyApi.setAccessToken('<%- token %>');

	var userDetails;
	var id; 
	var dw_id; 
	var tracks = {};
	var artists = {}; 
	var statusBar = document.getElementById("progress-bar"); 
	statusBar.style.width = "5%"; 

	spotifyApi.getMe().then(function (data) {
		id = data.id;
		userDetails = {
			display_name: data.display_name,
			email: data.email,
			profile_pic: data.images[0].url
		}
		console.log('User Details', userDetails); 
		statusBar.style.width = "15%";
		return id;
	})
	.then(function (user_id) {
		statusBar.style.width = "25%";
		return spotifyApi.getUserPlaylists(user_id, {limit:50});
	})
	.then(function (data) {
		statusBar.style.width = "40%";
		var items = data.items; 
	    for (var i = 0; i < items.length; i++) {
	    	if (items[i].owner.id == 'spotifydiscover') { 
	    		dw_id = items[i].id; 
	    		return items[i].id; 
	    	}
	    }
	})
	.then(function (playlist_id) {
		statusBar.style.width = "60%";
		return spotifyApi.getPlaylistTracks('spotifydiscover', playlist_id);
	})
	.then(function (data) {
		statusBar.style.width = "70%";
		for (var i = 0; i < data.items.length; i++) {
			var item = data.items[i];
			tracks[item.track.id] = { 
				name: item.track.name, 
				artist: item.track.artists[0].name
			}
			artists[item.track.artists[0].id] = item.track.artists[0].name;  
		}
	})
	.then(function () {
		statusBar.style.width = "80%";
		var user = {
			spotify_id: id, 
			details: userDetails, 
			dw_spotify_id: dw_id,
			tracks: tracks, 
			artists: artists,
			sorted_tracks: Object.keys(tracks).sort(),
			sorted_artists: Object.keys(artists).sort()
		}
		$.post( "/add-user", user)
		  .done(function (data) {
		    console.log('Success');
		    statusBar.style.width = "80%";
		}).fail(function (data){
			console.log('Failure')
		}) ;
	})
	.catch(function(error) {
		console.error(error);
	});
});




