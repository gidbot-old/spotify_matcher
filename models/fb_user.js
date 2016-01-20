// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var fbUserSchema = new Schema({
 	facebook_id: String
}, { collection: 'fb_users' });

var FB_User = mongoose.model('FB_User', fbUserSchema);

module.exports = FB_User;