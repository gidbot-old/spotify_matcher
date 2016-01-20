// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var lastWeekSchema = new Schema({
 	spotify_id: String,
 	tracks: Object
}, { collection: 'last_week' });

var LastWeek = mongoose.model('LastWeek', lastWeekSchema);

module.exports = LastWeek;