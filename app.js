var express = require('express')
, app = express()
, bodyParser = require('body-parser')
, cookieParser = require('cookie-parser')
, port = process.env.PORT || 3000
, path = require('path')
, router = express.Router()
, session = require('express-session')
, favicon = require('serve-favicon')
, mongoose = require('mongoose')
, config = require('./config');

var rejectedUrls = [
  'discover-weekly.herokuapp.com',
  'discover-weekly.com'
  ]

app.use(function (req, res, next) {
  var url = req.get('host');
  if (req.headers['x-forwarded-proto']!='https' || rejectedUrls.indexOf(url) > -1) {
    res.redirect('https://www.discover-weekly.com');
  } else {
    next();
  }
});

mongoose.connect(config.mongo_url);

app.use(favicon(path.join(__dirname,'public','img','favicon.ico')));


  var redis_url = config.redis_url;
  var store = new redisStore({ url: redis_url });

  app.use(cookieParser('yourothersecretcode'));

  app.use(session(
  {
    secret: 'yourothersecretcode', 
    store: store,
    saveUninitialized: true,  // don't create session until something stored,
    resave: true, 
    maxAge  : new Date(Date.now() + 3600000*24), // 24 Hours
    expires : new Date(Date.now() + 3600000*24)
  }
));

// app.use(session({ 
// 	secret: 'keyboard_cat', 
// 	cookie: {
// 	maxAge  : new Date(Date.now() + 3600000*24), // 24 Hours
// 	expires : new Date(Date.now() + 3600000*24)
// }, 
// resave: true, 
// saveUninitialized: true })); 


app.set('views', __dirname + '/views')
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');  

app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(require('./controllers'))


app.use(function(req, res, next) {
	res.redirect('/not-found');
});

app.listen(port, function() {
  console.log('Listening on port ' + port)
})

router.use('/', require('./controllers/index.js'));
app.use(router);






