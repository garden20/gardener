var npm = require('npm'),
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
	    var p_details = data[0][0].split('@'),
	    	package_name = p_details[0],
	    	package_version = p_details[1],
			install_dir = data[0][1];

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
	console.log(message);
}

