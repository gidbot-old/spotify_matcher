var express = require('express')
, app = express()
, bodyParser = require('body-parser')
, cookieParser = require('cookie-parser')
, port = process.env.PORT || 3000
, path = require('path')
, router = express.Router()
, session = require('express-session');


// app.use(favicon(path.join(__dirname,'public','img','favicon2.ico')));

app.use(session({ 
	secret: 'keyboard_cat', 
	cookie: {
	maxAge  : new Date(Date.now() + 3600000*24), // 24 Hours
	expires : new Date(Date.now() + 3600000*24)
}, 
resave: true, 
saveUninitialized: true })); 


app.set('views', __dirname + '/views')
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');  

app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(require('./controllers'))


app.use(function(req, res, next) {
  res.status(404).render('static/not_found');
});

app.listen(port, function() {
  console.log('Listening on port ' + port)
})

router.use('/', require('./controllers/index.js'));
app.use(router);






