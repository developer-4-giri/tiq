var swig = require('swig'),
	util = require('util'),
	accounting = require('accounting'),
	moment = require('moment');

module.exports.controller = function(app, org) {

  app.get('/dashboard', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = 'SELECT Id, AccountNumber, Name, AnnualRevenue, description, Owner.Name, Type FROM account ORDER BY CreatedDate DESC' ;
		org.query({query: query, oauth: req.session.oauth }, function(err, resp){
			if(!err && resp.records) {
				console.log("Account Query Result :" + util.inspect(resp.records, { showHidden: false }));
				res.render("salesforce/dashboard.html", { accounts: resp.records, userdetails: req.session.userdetails});
			}
		});  
  });
    
  app.get('/accounttimeline', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "SELECT Id, Name, AccountSource, AnnualRevenue, AccountNumber, Type, Owner.Name, (select AccountId, ActivityDate, ActivityType, CallType, Description, EndDateTime, Id, IsTask, OwnerId, Subject, WhatId, WhoId from ActivityHistories where IsClosed=true and IsDeleted = false order by ActivityDate desc) FROM Account where Id = '"+ req.query.accountid +"'";
		console.log("AccountDetails Query   :" + query);

		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			if(!err && resp.records) {
				console.log("AccountDetails Query  Result :" + util.inspect(resp.records, { showHidden: false }));
				console.log("AccountDetails Query  Result - activityhistories :" + util.inspect(resp.records[0]._fields.activityhistories, { showHidden: false }));
				
				console.log(util.inspect(resp.records[0]._fields.owner, { showHidden: false }));
				res.render("salesforce/timeline.html", { page_title: 'Client Timeline - '+resp.records[0]._fields.name, accountdetails: resp.records[0], userdetails: req.session.userdetails });
			}
		});
  });
  
  app.get('/gettotalrevenueofall', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "Select sum(AnnualRevenue) from Account where IsDeleted = false";
		console.log("TotalRevenueOfAllClient Query  :" + query);

		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			if(!err && resp.records) {
				console.log(resp.records[0]._fields.expr0 +"  >>>>> "+ util.inspect(resp.records[0]._fields.expr0, { showHidden: false }));
				res.send(200,""+resp.records[0]._fields.expr0);
			}
		});
  });
  
  app.get('/getannualrevenuepercent', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "Select Id, AnnualRevenue from Account where id = '"+req.query.accountid +"'";
		console.log("Account Annual Revenue Query :" + query);
		
		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			if(!err && resp.records) {
				console.log("AnnualRevenue Percent Query-1  Result :" + util.inspect(resp.records, { showHidden: false }));

				if(resp.records.length > 0){
					var annualRevenue = resp.records[0]._fields.annualrevenue ;
					console.log('Client Annual Revenue :'+ annualRevenue);
					
					var query = "Select sum(AnnualRevenue) from Account where IsDeleted = false";
					org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
						if(!err && resp.records) {
							var totalRevenue = resp.records[0]._fields.expr0 ;
							res.send(200,""+accounting.toFixed( ((annualRevenue*100)/totalRevenue), 2)+"%");
						}
					});
				}
				else{
					res.send(200,  {"result":"ZERO %"});
				}
			}
		});
  });
  
  app.get('/getproductsbought', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "Select Id, Account.AccountNumber, Account.Name, (Select PricebookEntry.Product2.Name From OpportunityLineItems), Amount  From Opportunity where Account.Id = '" + req.query.accountid + "' and IsClosed=true and IsWon= true and IsDeleted=false";
		console.log("Products Bought Query :" + query);
		
		org.query({query: query, oauth: req.session.oauth }, function(err, resp){
			if(!err && resp.records) {
				console.log("Products Bought Query Result :" + util.inspect(resp.records, { showHidden: false }));
				if(resp.records.length > 0 && resp.records[0]._fields.opportunitylineitems && resp.records[0]._fields.opportunitylineitems.length > 0){
					var productsBought = "";
					for(var i=0; i < resp.records[0]._fields.opportunitylineitems.length ; i++ ){
						if(i == resp.records[0]._fields.opportunitylineitems.length-1 )
							productsBought = resp.records[0]._fields.opportunitylineitems[i].PricebookEntry.Product2.Name;
						else
							productsBought = resp.records[0]._fields.opportunitylineitems[i].PricebookEntry.Product2.Name+", ";
					}
					res.send(200, productsBought);
				}
				else{
					res.send(200,"");
				}
			}
		});  
  });

  app.get('/getacquiredthrough', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "SELECT Id, Name, convertedAccountId from Lead  where convertedAccountId = '" + req.query.accountid + "'";
		console.log("Acquired Through Query :" + query);
		
		org.query({query: query, oauth: req.session.oauth }, function(err, resp){
			if(!err && resp.records) {
				console.log("Acquired Through Query Result :" + util.inspect(resp.records, { showHidden: false }));
				if(resp.records.length > 0){
					res.send(200,""+resp.records[0]._fields.name);
				}
				else{
					res.send(200,"Data Not Available");
				}
			}
		});  
  });
  
  
  app.get('/getaccountactivity', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "SELECT Id, (select AccountId, ActivityDate, ActivityType, CallType, Description, EndDateTime, Id, IsTask, OwnerId, Subject, WhatId, WhoId from ActivityHistories where IsClosed=true and IsDeleted = false order by ActivityDate desc) FROM Account where Id = '"+ req.query.accountid +"'";
		console.log("AccountActivity Query   :" + query);
		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			if(!err && resp.records &&  resp.records.length > 0 && resp.records[0]._fields.activityhistories) {
				console.log("AccountActivity Query  Result :" + util.inspect(resp.records[0]._fields.activityhistories.records, { showHidden: false }));
				res.send(200, resp.records[0]._fields.activityhistories.records);
			}else
				res.send(200, "No Activity Data Found");
		});
  });
  
  app.get('/getintroducedondate', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "select ConvertedAccountId, ConvertedDate, CreatedDate, Description, Id, Name from Lead where ConvertedAccountId ='"+ req.query.accountid +"'";
		console.log("IntroducedOn Query  :" + query);

		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			if(!err && resp.records) {
				console.log("AccountDates Query  Result :" + util.inspect(resp.records[0], { showHidden: false }));
				if(resp.records.length > 0)
					res.send(200, resp.records[0]._fields.createddate.substr(0,10));
				else
					res.send(200, "Data Not Available");
			}
		});
  });

  app.get('/getclientsincedate', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "select Id , (select AccountId, Amount,CloseDate, Description from Opportunities  where IsClosed=true and IsDeleted=false and IsWon=true order by CloseDate limit 1 ) from Account where id ='"+ req.query.accountid +"'";
		console.log("ClientSince Query  :" + query);
		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			console.log("ClientSince Query  Result :" + util.inspect(resp, { showHidden: false }));
			if(!err && resp.records && resp.records.length > 0 && resp.records[0]._fields.opportunities && resp.records[0]._fields.opportunities.records[0]) {
				console.log("ClientSince Date :" + util.inspect(resp.records[0]._fields.opportunities.records[0].CloseDate, { showHidden: false }));
				if(resp.records[0]._fields.opportunities.records[0].CloseDate)
					res.send(200, resp.records[0]._fields.opportunities.records[0].CloseDate.substr(0,10));
				else
					res.send(200, "Data Not Available");
			}
			else
				res.send(200, "Data Not Available");
		});
  });
 
  app.get('/getlifetimevalue', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "select Amount, CloseDate, StageName from Opportunity where  IsWon = true and IsClosed = true and IsDeleted = false and AccountId='"+ req.query.accountid +"' order by CloseDate";
		console.log("ClientLifetimeValue Query  :" + query);

		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			if(!err && resp.records) {
				var clv=0;
				console.log("CustomerLifeTimeValue Query  Result :" + util.inspect(resp.records, { showHidden: false }));
				if(resp.records.length > 0 ){
					for(var i=0; i< resp.records.length; i++)
						clv += resp.records[i]._fields.amount
				}
				res.send(200, ""+accounting.formatMoney(clv));
			}
		});
  });
  
  app.get('/getimetoacquire', verifyIfUserIsAutherisedBySalesForce, checkIfUserIsActiveAndHasValidAppLicense, function(req, res) {
		var query = "select CreatedDate from Lead where ConvertedAccountId ='"+ req.query.accountid +"'";
		
		org.query({ query:query, oauth: req.session.oauth}, function(err, resp){
			if(!err && resp.records && resp.records.length > 0){
				console.log("TimeToacquire Query-1  Result :" + util.inspect(resp.records[0], { showHidden: false }));
				var introducedondate = resp.records[0]._fields.createddate.substr(0,10);
				
				var subquery = "select CloseDate from Opportunity where  IsWon = true and IsClosed = true and IsDeleted = false and AccountId='"+ req.query.accountid +"' order by CloseDate";
				org.query({ query:subquery, oauth: req.session.oauth}, function(err, resp){
					if(!err && resp.records && resp.records.length >0 ){
						console.log("TimeToacquire Query-2  Result :" + util.inspect(resp.records[0], { showHidden: false }));
						var oppclosedate = resp.records[0]._fields.closedate.substr(0,10);

						var startDate = moment(introducedondate, 'YYYY-M-DD')
						var endDate = moment(oppclosedate, 'YYYY-M-DD')
						
						var daysDiff = endDate.diff(startDate, 'days')

						res.send(200, daysDiff+" days" );
					}else
						res.send(200, "Data Not Avaiable" );
				});
			}else
				res.send(200, "Data Not Available");
		});
  });
  
  
  function verifyIfUserIsAutherisedBySalesForce(req, res, next) {
	  if (req.session.oauth && req.session.oauth.access_token) {
	    next();
	  } else {
		res.render("error.html", { error_message: 'User is not autherised by Salesforce. Please contact your administrator.' });
	  }
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
  

}