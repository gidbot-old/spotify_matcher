// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var matchSchema = new Schema({
 	facebook_id: String,
 	spotify_id: String,
 	matches: Array

}, { collection: 'matches' });

var Match = mongoose.model('Match', matchSchema);

module.exports = Match;