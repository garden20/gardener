var npm = require('npm'),
	logger = require('./logger'),
	package_dir = 'installed_packages';


exports.init = function(callback) {
	npm.load({}, function(err) {
		if (err) return callback(err);
		npm.on("log", log);
		callback(null);
	});	
}	

exports.install = function(url, callback) {
	npm.commands.install(package_dir, url, function (err, data) {
	    if (err) return callback(err);
	    // ok, not really sure of the order of data... this is a guess for now.
	    var i = data.length - 1;
	    var p_details = data[i][0].split('@'),
	    	package_name = p_details[0],
	    	package_version = p_details[1],
			install_dir = data[i][1];

	    callback(null, {
	    	install_dir: install_dir,
	    	package_name: package_name,
	    	package_version: package_version
	    });
	})	
}

exports.start = function(packages, callback) {
	npm.commands.start(packages, callback);
}


function log(msg) {
	logger.custom('npm', 'info', msg);
}

