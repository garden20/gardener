var request = require('request'),
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
	console.log(ddoc_url);
	var db_url = url.resolve(ddoc_url, '..');
	request({url: db_url, json: true}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	if (body.db_name) return callback(null, db_url);
	    else return callback(new Error('Cant determine database url'));
	  }
	  callback(error);
	})		
}