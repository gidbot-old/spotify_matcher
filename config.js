var config = {};

// config.mongo_url = process.env.COMPOSE_MONGO_URL;
// config.spotify_redirect = 'http://discover-weekly.herokuapp.com/auth/spotify/callback';

config.mongo_url = "mongodb://localhost:27017/spotify";
config.spotify_redirect = 'http://localhost:3000/auth/spotify/callback'; 


module.exports = config;
