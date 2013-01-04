var fs = require('fs'),
	path = require('path'),
	async = require('async'),
	forever = require('forever-monitor'),
	npm_manager = require('./npm_manager'),
	working_dir = 'working_dir',
	package_dir = 'installed_packages',
	folder = path.join(package_dir, 'node_modules');

exports.start = function(callback) {
	async.waterfall([
		list_packages,
		init_working_dirs,
		start_forever
	], function(err) {
		console.log(err);
		callback(err);
	});
}

function list_packages(callback) {
	fs.readdir(folder, function(err, files) {
		if (err && err.code !== 'ENOENT') return callback(err);
		if (err) return callback(null, []);
		callback(null, files);
	});
}

function init_working_dirs(packages, callback) {
	if (!fs.existsSync(working_dir)){
		fs.mkdirSync(working_dir);
	}

	async.forEach(packages, function(package, cb) {
		var package_working_dir = get_working_dir(package);
	    if (!fs.existsSync(package_working_dir)){
	            return fs.mkdir(package_working_dir, cb);
	    }
	    return cb(null, package_working_dir, package);
	}, function(err) {
		callback(err, packages);
	})
}

function get_working_dir(package) {
	return path.join(working_dir, package);
}

function get_package_dir(package) {
	return path.join(folder, package);
}

function get_start_script(package_dir) {
	return path.join(package_dir, 'server.js');
}

function start_forever(packages, callback) {
	async.forEach(packages, function(package, cb) {
		console.log('starting: ', package);
		var working_dir = get_working_dir(package),
			package_dir = get_package_dir(package),
			start_script = get_start_script(package_dir),
			opts = getForeverOptions(working_dir)
		forever_bind(package, start_script, opts);
		cb(null);
	}, callback);
}

function forever_bind(package, start_script, opts) {
	var child = new (forever.Monitor)(start_script, opts);
	child.on('error', function(err) {  process_error(package, err);    });
	child.on('start', function(process, data) {  process_start(package, process, data);    });
	child.on('stop',  function(process) {  process_stop(package, process);    });
	child.on('restart', function() {  process_restart(package);    });
	child.on('exit', function() {  process_exit(package);    });
	child.on('stdout', function(data) {  process_stdout(package, data);    });
	child.on('stderr', function(data) {  process_stderr(package, data);    });
	child.start();
	return child;
}


function  process_error(package, err) {
	console.log('ERROR:', package, err);
}

function process_start(package, process, data) {
	console.log('START:', package);
}

function process_stop(package, process) {
	console.log('STOP:', package);
}

function process_restart(package) {
	console.log('RESTART:', package);
}

function process_exit(package) {
	console.log('EXIT:', package);
}

function process_stdout(package, data) {
	console.log(package, data.toString());
}

function process_stderr(package, data) {
	console.log(package, data.toString());
}








function getForeverOptions(working_dir) {
	var foreverOptions = {
		fork:      true,
		silent:    false,
		cwd:       working_dir,
		killTree:  true,
		killTTL:   0,
	};
}



