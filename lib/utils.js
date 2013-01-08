var request = require('request'),
	async = require('async'),
	url = require('url');

exports.toBase64 = function(str) {
  return  (new Buffer(str || "", "utf8")).toString("base64");
};


exports.fromBase64 = function(str) { 
  return (new Buffer(str || "", "base64")).toString("utf8");
};

exports.get_node_module_name = function(ddoc_url, callback) {
	request({url: ddoc_url, json: true}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    return callback(null, body.node_module) 
	  }
	  callback(error);
	})	
}

exports.get_db_url = function(ddoc_url, callback) {
	var db_url = url.resolve(ddoc_url, '..');
	request({url: db_url, json: true}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	if (body.db_name) return callback(null, db_url);
	    else return callback(new Error('Cant determine database url'));
	  }
	  callback(error);
	})		
}

exports.get_couch_info = function(url, callback) {
	async.auto({
		couch_root_url : function(cb) { find_couch_url(url, cb) },
		dashboard_db_url : ['couch_root_url', function(cb, data) {  find_dashboard_db_url(data.couch_root_url, cb); }],
		// onlyWatchDb : [watchDbUrl, onlyWatchDb],
		// isGarden : [watchDbUrl, isGarden]
	}, callback)
}

function find_couch_url(start_url, callback) {
	var suspects = possibleCouchUrls(start_url);
	async.detectSeries(suspects, is_couch_root, function(result) {
		if (!result) return callback('Cant find a couch url, based on url: ' + start_url);
		callback(null, result);
	})
}

function possibleCouchUrls(start_url) {
	var results = []
	results.push(url.resolve(start_url, '/'))
	results.push(url.resolve(start_url, '/_couch'))
	results.push(url.resolve(start_url, '/dashboard/_design/dashboard/_couch'))
	return results;
	
}


function is_couch_root(url, callback) {
	request({url: url, json: true}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	if (body.couchdb && body.couchdb === 'Welcome') return callback(true);
	  }
	  callback(false);
	});
}


function find_dashboard_db_url(couch_root_url, callback) {
	var suspects = possibleDashboardUrls(couch_root_url);
	async.detectSeries(suspects, is_dashboard_db, function(result) {
		// this one is not an error if not found...
		callback(null, result);
	})	
}

function possibleDashboardUrls(couch_root_url) {
	var results = []
	results.push(url.resolve(couch_root_url, '/dashboard/_design/dashboard/_rewrite/_db'))
	results.push(url.resolve(couch_root_url, '/dashboard'))
	return results;
}

function is_dashboard_db(url, callback) {
	request({url: url, json: true}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	if (body.db_name && body.db_name === 'dashboard') return callback(true);
	  }
	  callback(false);
	});	
}





