var	util = require('util'),
	request = require('request'),
	pg = require('pg');

// all environments
var databaseURL = process.env.DATABASE_URL || 'postgres://postgres:postgrespass@localhost:5433/postgres'; 

module.exports.controller = function(app, org) {

  app.get('/', function(req, res) {
	res.render("landing.html", { title: 'Timeline IQ' , userdetails: req.session.userdetails } );
  });

  app.get('/sflogin', function(req, res) {
	    req.session.destroy();
		res.redirect(org.getAuthUri());
  });

  app.get('/sflogin/auth/error', function(req, res) {
		res.render("error.html", { error_message: 'User is not autherised by Salesforce. Please contact your administrator.' });
  });
  
  app.get('/sflogin/auth/success', getUserDetailsFromSalesforce, getUserRolesAndLicenseDetailsFromTimelineIQ, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		res.redirect('/dashboard');
  });
  
  app.post('/validatetiqlogin', checkIfUserIsAutherisedBySalesForceUsingUserIdAndPass, getUserDetailsFromSalesforce, getUserRolesAndLicenseDetailsFromTimelineIQ, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		res.redirect('/dashboard');
  });
	
  app.get('/logout', function(req, res) {
	  req.session.destroy();
	  res.redirect('/');
  });

  app.get('/userprofile', function(req, res) {
		console.log(req.session.userdetails);
	    res.render('user/userprofile.html', { title: 'TimelineIQ - User Profile', userdetails: req.session.userdetails , userlicencedetails: req.session.userlicencedetails});
  });
    
  function verifyIfUserIsAutherisedBySalesForce(req, res, next) {
	  if (req.session.oauth && req.session.oauth.access_token) {
	    next();
	  } else {
		res.render("error.html", { error_message: 'User is not autherised by Salesforce. Please contact your administrator.' });
	  }
  };

  function checkIfUserIsAutherisedBySalesForceUsingUserIdAndPass(req, res, next) {
		var userName = req.param('username');
		var userPass = req.param('userpass');
		
	    org.authenticate({ username: userName, password: userPass}, function(err, resp){
			if(!err) {
			    req.session.oauth = resp;
			    next();
			 } else {
			    console.log('Error while authenticating with Salesforce for User('+ userName+') : ' + err.message);
				res.render("error.html", { error_message: 'Error while authenticating with Salesforce. Please contact your administrator.' });
			 }
	    });
  };
  
  function getUserDetailsFromSalesforce(req, res, next) {
	    request(req.session.oauth.id+'?format=json&oauth_token='+ req.session.oauth.access_token, function (err, response, body) {
			  if (!err && response.statusCode == 200) {
			    req.session.userdetails = JSON.parse(body);
			    next();
			  }else{
			    console.log('Could not get USerdetails from Salesforce the Userwith Id('+ req.session.oauth.id +') : ' + err);
			  }
		});
  };

  function checkIfUserIsActiveAndHasValidAppLicense(req, res, next) {
		if(req.session.userlicencedetails.LIC_END_DATE <  Date.now() || !req.session.userlicencedetails.LIC_ACTIVE){
			console.log("User licence has expired. Please contact your administrator.");
			res.render("error.html", { error_message: 'User licence has expired. Please contact your administrator.' });
		}
		else if(!req.session.userlicencedetails.USER_ACTIVE){
			console.log("User is not an active user. Please contact your administrator.");
			res.render("error.html", { error_message: 'User is not an active user. Please contact your administrator.' });
		}else{
			next();
		}
  };

  function getUserRolesAndLicenseDetailsFromTimelineIQ(req, res, next){
		pg.connect(databaseURL, function(err, client, done) {
			if(!err){
				var queryString = 'SELECT "LIC"."LIC_ID","LIC"."LIC_START_DATE","LIC"."LIC_END_DATE", "LIC"."IS_ACTIVE" as "LIC_ACTIVE", "USR"."USER_ID", "USR"."USER_DISPLAY_NAME", "USR"."USER_SECRET", "USR"."USER_ORG_NAME", "USR"."USER_ACTIVE", "USR"."USER_ROLES" '+
					       ' FROM "TIQ"."LICENSES" "LIC", "TIQ"."USERS" "USR" '+
					       ' WHERE "USR"."USER_LIC_ID" = "LIC"."LIC_ID" AND "USR"."USER_ID" = \''+req.session.userdetails.email+'\'';
				
				client.query(queryString, function(err, result) {
		            if(result.rows.length > 0){
						var userlicencedetails = JSON.parse(JSON.stringify(result.rows[0]));
						userlicencedetails.USER_SECRET = 'THISISSECRET....DUDE';
						
						req.session.userlicencedetails = userlicencedetails;
		            }else{
		    			res.render("error.html", { error_message: 'Not a TimelineIQ user. Please contact your administrator.' });
		            }
		            
		            done();
		            next();
		          });
			}else{
				res.render("error.html", { error_message: 'Error Validating the user - could not connect to vaildation server. Please contact your administrator.' });
			}
		});
	}
  

}