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
	npm.commands.install(package_dir, url, function (er, data) {
	    if (er) return callback(err);
	    var install_dir = data[0][1];
	    callback(null, install_dir);
	})	
}

exports.start = function(packages, callback) {
	npm.commands.start(packages, callback);
}


function log(msg) {
	console.log(message);
}

