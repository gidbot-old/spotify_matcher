var config = {};

config.mongo_url = process.env.COMPOSE_MONGO_URL;
config.spotify_redirect = "https://www.discover-weekly.com/auth/spotify/callback";
config.redis_url = process.env.REDIS_URL; 
config.twitter_consumer_key = process.env.TWITTER_CONSUMER_KEY; 
config.twitter_consumer_secret = process.env.TWITTER_CONSUMER_SECRET;
config.twitter_access_token_key = process.env.TWITTER_ACCESS_TOKEN_KEY;
config.twitter_access_token_secret = process.env.TWITTER_ACCESS_TOKEN_SECRET;


// config.mongo_url = "mongodb://gidbot:ttfbtb2404@candidate.37.mongolayer.com:11137,candidate.52.mongolayer.com:10829/spotify?replicaSet=set-5689c22023371e1d340008f6";
// config.mongo_url = "mongodb://localhost:27017/spotify";
// config.spotify_redirect = 'http://localhost:3000/auth/spotify/callback'; 

module.exports = config;
