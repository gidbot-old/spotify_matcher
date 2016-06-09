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
  name : String,
  spotify_refresh_token: String,
  created_at : Date

}, { collection: 'users' });

userSchema.pre('save', function(next){
  if ( !this.created_at ) {
    this.created_at = new Date();
  }
  next();
});


var User = mongoose.model('User', userSchema);

module.exports = User;