var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var topMatchSchema = new Schema({
 	facebook_id_1: String,
 	facebook_id_2: String,
 	score: Number, 
 	created_at : Date

}, { collection: 'top_matches' });

topMatchSchema.pre('save', function(next){
  if ( !this.created_at ) {
    this.created_at = new Date();
  }
  next();
});

var TopMatch = mongoose.model('TopMatch', topMatchSchema);

module.exports = TopMatch;