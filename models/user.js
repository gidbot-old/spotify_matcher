// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
  spotify_id : String,
  dw_spotify_id : String,
  tracks : Object,
  artists : Object,
  sorted_tracks: Array,
  sorted_artists: Array,
  profile_pic : String,
  facebook_id : String,
  name : String
}, { collection: 'users' });

var User = mongoose.model('User', userSchema);

module.exports = User;