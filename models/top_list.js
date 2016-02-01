var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var topListSchema = new Schema({
 	date_added: Date,
 	tracks: Object
}, { collection: 'top_tracks' });

var Top_List = mongoose.model('Top_Track', topListSchema);

module.exports = Top_List;