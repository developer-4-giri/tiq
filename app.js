var express = require('express'),
    path = require('path'),
    nforce = require('nforce'),
    fs = require('fs'),
	swig = require('swig'),
	pg = require('pg');


// all environments
var port = process.env.PORT || 3001; 
var SF_clientId = process.env.SALESFORCE_CLIENT_ID || '3MVG9A2kN3Bn17huFN0b_0IIMm73gDPL02zlAsYMeMZnCbUFTc4IFQp6DO9xR8.2WX4I8G696TLGZnT0Pseeo';
var SF_clientSecret = process.env.SALESFORCE_CLIENT_SECRET || '1695242897487600056';
var SF_redirectUri = process.env.SALESFORCE_REDIRECT_URI || 'https://timelineiq.herokuapp.com/sflogin/auth/success';
var coockies_secret = process.env.COOCKIES_SECRET || '3MVG9A2kN3Bn17huFN0b_0IIMmwWY_JSmQedLaC6lqQiioH_eZ3LCyoYykGOnEvg.xPxfiEsmFrCJewWx3Rrp';
var session_secret = process.env.SESSION_SECRET || '3MVG9A2kN3Bn17huFN0b_0IIMmwWY_JSmQedLaC6lqQiioH_eZ3LCyoYykGOnEvg.xPxfiEsmFrCJewWx3Rrp';

var oauth;
var org = nforce.createConnection({
	  clientId: SF_clientId,
	  clientSecret: SF_clientSecret,
	  redirectUri: SF_redirectUri
	});

// some environment variables
var app = express();
app.set('title', 'Timeline IQ');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.engine('html', swig.renderFile);

app.use(express.favicon());
app.use(express.logger());

app.use(express.bodyParser());
app.use(express.compress());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());

app.use(express.cookieParser(coockies_secret));
app.use(express.session({secret: session_secret}));

app.use(org.expressOAuth({onSuccess: '/sflogin/auth/success', onError: '/sflogin/oauth/error'}));  

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// dynamically include routes (Controller)
fs.readdirSync('./controllers').forEach(function (file) {
  if(file.substr(-3) == '.js') {
      route = require('./controllers/' + file);
      route.controller(app, org);
  }
});

app.listen(port, function(){
	  console.log("Express server listening on port %d in %s mode", port, app.settings.env);
});
