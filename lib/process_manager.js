var fs = require('fs'),
	path = require('path'),
	async = require('async'),
	url = require('url'),
	semver = require('semver'),	
	is = require('is-js'),
	forever = require('forever-monitor'),
	request = require('request'),
	npm_manager = require('./npm_manager'),
	process_manager = require('./process_manager'),
	gardener_http = require('./gardener_http'),	
	utils = require('./utils'),
	working_dir = 'working_dir',
	package_dir = 'installed_packages',
	cache_name = '.details',
	folder = path.join(package_dir, 'node_modules'),
	running_processes = {};

exports.start = function(callback) {
	 async.waterfall([
	 	gather_modules,
	 	start_forever
	 ], function(err) {
	 	callback(err); 
	 });
}


exports.install = function(details, callback) {
	var ddoc_url;
	var pre_details = details;
	if (is.object(details)) {
		ddoc_url = details.ddoc_url;
	} else if (is.string(details)) {
		ddoc_url = details;
		pre_details = {};
	}
	_fill_missing_install_details(ddoc_url, pre_details, function(err, all_details) {
		if (err) return callback(err);
		_install(all_details, callback);			
	});	
}


function _fill_missing_install_details(ddoc_url, other, callback) {
	var re = /-([0-9]+\.[0-9]+\.[0-9]+(-[0-9]+-?)?([a-zA-Z-+][a-zA-Z0-9-\.:]*)?)\.tgz$/;
	async.auto({
		start_immediate: function(cb) {
			cb(null, other.start_immediate);
		},
		module_name : function(cb) {
			if (other.module_name) return cb(null, other.module_name);
			utils.get_node_module_name(ddoc_url, cb) 
		},
		package_version : ['module_name', function(cb, data) {
			var version = data.module_name.match(re)[1];
			cb(null, version);
		}],
		local_name : function(cb)  {
			if (other.local_name) return cb(null, other.local_name);
			cb(null, utils.local_name(ddoc_url)) 
		},
		db_url : function(cb) {
			if (other.db_url) return cb(null, other.db_url);
			utils.get_db_url(ddoc_url, cb);
		}
	}, function(err, details) {
		details.ddoc_url = ddoc_url;
		callback(err, details);
	});	
}


function _install(details, callback) {
	is_installed(details, function(err, installed){
		if (installed) return callback(null);
		async.auto({
			install_package: function(cb) {
				var package_url = url.resolve(details.ddoc_url + '/',   details.module_name);
				npm_manager.install(package_url, cb);				
			},
			cache_details: ['install_package', function(cb, data) {
				details.install_package = data.install_package;
				cache_details(details.local_name, details, cb);  
			}]
		}, function(err, results) {
			if (err || !details.start_immediate ) return callback(err, results);
			exports.start_module(details.local_name, callback);
		});
	})
}

exports.start_module = function(local_name, callback) {
	async.auto({
		cache: function(cb) { load_cache_details(local_name, cb) },
		start_forever: ['cache', function(cb, data) {
			start_forever([data.cache], callback);
		}]
	});
	
}

function module_working_dir(local_name) {
	return path.join(working_dir, local_name);
}


function is_installed(details, callback) {
	load_cache_details(details.local_name, function(err, cache) {
		if (err) {
			// check that is just not found...
			return callback(null, false);
		} 
		return callback(null, (cache.module_name === details.module_name));


	})
}


function cache_details(local_name, details, callback) {

	init_working_dirs([details], function(err) {
		if (err) return callback(err);
		var folder = module_working_dir(local_name),
			cache  = path.join(folder, cache_name);
		fs.writeFile(cache, JSON.stringify(details, 3), callback);		
	})
}


function load_cache_details(local_name, callback) {
	var folder = module_working_dir(local_name),
		cache  = path.join(folder, cache_name);
		fs.readFile(cache, function(err, data) {
			if (err) return callback(err);			
			return callback(null, JSON.parse(data));
		})	
}


function gather_modules(callback) {
	if (!fs.existsSync(working_dir)){
		fs.mkdirSync(working_dir);
	}	
	fs.readdir(working_dir, function(err, files) {
		if (err && err.code !== 'ENOENT') return callback(err);
		if (err) return callback(null, []);
		async.map(files, load_cache_details, callback);
	});
}

function init_working_dirs(module_localnames, callback) {
	if (!fs.existsSync(working_dir)){
		fs.mkdirSync(working_dir);
	}

	async.forEach(module_localnames, function(module, cb) {
		var module_working_dir = get_working_dir(module);	
	    if (!fs.existsSync(module_working_dir)){
	        return fs.mkdir(module_working_dir, cb);
	    }
	    return cb(null, module_working_dir, module);
	}, function(err) {
		callback(err, module_localnames);
	})
}

function get_working_dir(module_detail) {
	return path.join(working_dir, module_detail.local_name);
}

function get_package_dir(module_detail) {
	return module_detail.install_package.install_dir;
}

function get_start_script(package_dir) {
	return path.join(package_dir, 'server.js');
}

function start_forever(module_details, callback) {
	async.forEach(module_details, function(module_detail, cb) {
		if (running_processes[module_detail.local_name]) {
			console.log('WARNING: module ', module_detail.local_name, ' is already running');
			cb(null);
		}

		console.log('starting: ', module_detail.install_package.package_name, ' in dir ', module_detail.local_name);
		var working_dir = get_working_dir(module_detail),
			package_dir = get_package_dir(module_detail),
			start_script = path.resolve(get_start_script(package_dir)),
			opts = getForeverOptions(working_dir),
			route =  (url.parse(module_detail.ddoc_url).path),
			process = forever_bind(module_detail.install_package.package_name, start_script, opts, route);
			running_processes[module_detail.local_name] = process;
		cb(null);
	}, callback);
}

function forever_bind(package, start_script, opts, route) {
	var child = new (forever.Monitor)(start_script, opts);
	child.once('error', function(err) {  process_error(package, err);    });
	child.once('start', function(process, data) {  process_start(package, process, data);    });
	child.on('stop',  function(process) {  process_stop(package, process);    });
	child.on('restart', function() {  process_restart(package);    });
	child.once('exit', function() {  process_exit(package);    });
	child.on('stdout', function(data) {  process_stdout(package, data);    });
	child.on('stderr', function(data) {  process_stderr(package, data);    });
	child.on('message', function(data) {  
		if (data.port) {
			gardener_http.add_app(route, data.port);
		}
	})
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
	return  {
		fork:      true,
		silent:    true,
		cwd:       working_dir,
		stdio:     [ 'ipc', 'pipe', 'pipe' ],
		killTree:  true,
		killTTL:   0,
	};
}



