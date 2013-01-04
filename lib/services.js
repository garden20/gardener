var npm_manager = require('./npm_manager'),
	fs = require('fs'),
	path = require('path'),
	package_dir = 'installed_packages',
	folder = path.join(package_dir, 'node_modules');


function list_packages(callback) {
	
	fs.readdir(folder, callback);
}


exports.start = function() {
	list_packages(function(err, packages) {
		console.log('starting packages: ', packages);

		var packages_with_paths = packages.map(function(package) {
			return '../' + path.join(folder, package);
		})

		npm_manager.start(packages_with_paths, function(err, data){
			console.log(err, data);
		});
	})
}



