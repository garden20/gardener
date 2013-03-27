var fs = require('fs'),
    url = require('url'),
    path = require('path'),
    async = require('async'),
    semver = require('semver'),

    is = require('is-js'),
    forever = require('forever-monitor'),
    request = require('request'),
    safeUrl = require('safe-url'),

    logger = require('./logger'),
    npm_manager = require('./npm'),
    process_manager = require('./processes'),
    gardener_http = require('./http'),
    utils = require('./utils'),
    options = require('./options'),

    working_dir = 'working_dir',
    package_dir = 'installed_packages',
    cache_name = '.details',
    folder = path.join(package_dir, 'node_modules'),
    running_processes = {},
    dashboard_db,
    couch_root_url;

exports.start = function(couch_root, dash_db, callback) {
    couch_root_url = couch_root;
    dashboard_db = dash_db;
     async.waterfall([
        gather_modules,
        start_forever
     ], function(err) {
        callback(err);
     });
};


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
};


function _fill_missing_install_details(ddoc_url, other, callback) {
    var re = /-([0-9]+\.[0-9]+\.[0-9]+(-[0-9]+-?)?([a-zA-Z-+][a-zA-Z0-9-\.:]*)?)\.tgz$/;

    var data = {};
    module_name(ddoc_url, other, data, function(err, module_name){
        data.module_name = module_name;
        async.parallel([
            function start_immediate(cb) {
                data.start_immediate = other.start_immediate;
                cb();
            },
            function is_remote_package(cb) {
                data.is_remote_package = !utils.is_tgz(data.module_name);
                cb();
            },
            function package_version(cb) {
                var parts = data.module_name.match(re);
                if (parts && parts.length > 0) {
                    data.version = data.module_name.match(re)[1];
                    return cb();
                } else {
                    // this is just a npm name
                    var nv = data.module_name.split("@"),
                        name = nv[0],
                        version = nv[1];
                    if (version) {
                        data.version = version;
                        return cb();
                    }

                    // no version spcified, check npm
                    npm_manager.current_details(data.module_name, function(err, current_details){
                        data.version = current_details.version;
                        cb();
                    });
                }

            },
            function local_name(cb)  {
                if (other.local_name) data.local_name = other.local_name;
                else data.local_name = utils.local_name(ddoc_url, module_name);
                cb();
            },
            function db_name(cb) {
                if (other.db_name) {
                    data.db_name = other.db_name;
                    return cb();
                }
                utils.get_db_name(ddoc_url, function(err, db_name){
                    data.db_name = db_name;
                    cb();
                });
            },
            function db_url(cb) {
                if (other.db_url) {
                    data.db_url = other.db_url;
                    return cb();
                }
                utils.get_db_url(ddoc_url, function(err, db_url){
                    data.db_url = db_url;
                    cb();
                });
            }
        ], function(err) {
            data.ddoc_url = ddoc_url;
            callback(err, data);
        });
    });
}


function module_name(ddoc_url, other, data, cb) {
    if (other.module_name) {
        if (other.module_digest) {
            data.module_digest = other.module_digest;
        }
        return cb(null, other.module_name);
    }
    utils.get_node_module_details(ddoc_url, function(err, deets) {
        data.module_digest = deets.module_digest;
        return cb(null, deets.module_name);
    });
}


function progress(message, percent, details) {
    if (!dashboard_db) return;

    var dash_db = url.resolve(couch_root_url, dashboard_db);

    var doc = {
        type: 'gardener_progress',
        time: new Date().getTime(),
        path:  url.parse(details.ddoc_url).path,
        module: details.module_name,
        percent: percent,
        'msg': message
    };
    request({
        url: dash_db,
        method: 'POST',
        json: doc
    }, function(err){
        console.log(err);
    });
}

function _install(details, callback) {
    is_installed(details, function(err, installed){
        if (installed) {
            logger.info('module is already installed', details);
            return callback(null);
        }
        var safe = {
            ddoc_url: safeUrl(details.ddoc_url),
            db_url: safeUrl(details.db_url)
        };
        logger.info('installing ' + details.module_name, safe);
        progress('Installing ' + details.module_name, 10, details);

        async.auto({
            stop_module: function(cb) {
                logger.info('Checking if module '+ details.module_name +' needs to be stopped');
                if (running_processes[details.local_name]) {
                    progress('Stopping module' + details.module_name, 15, details);
                    exports.stop(details.local_name, cb);
                } else cb();
            },
            install_package: ['stop_module', function(cb) {
                var package_url = url.resolve(details.ddoc_url + '/',   details.module_name);
                if (details.is_remote_package) {
                    package_url = details.module_name;
                }
                progress('Installing module' + details.module_name, 30, details);
                npm_manager.install(package_url, cb);
            }],
            cache_details: ['install_package', function(cb, data) {
                details.install_package = data.install_package;
                cache_details(details.local_name, details, cb);
            }],
            run: ['cache_details', function(cb, data){
                if (!details.start_immediate ) return cb();
                progress('Running module' + details.module_name, 60, details);
                if (running_processes[details.local_name]) {
                    exports.restart(details.local_name, cb);
                } else if (details.start_immediate) {
                    exports.start_module(details.local_name, cb);
                }
            }],
            report: ['run', function(cb) {
                if (!details.start_immediate ) return cb();
                progress('Module Ready', 100, details);
            }]
        }, function(err, results) {
            if (err || !details.start_immediate ) return callback(err, results);
            callback();
        });
    });
}

exports.start_module = function(local_name, callback) {
    async.auto({
        cache: function(cb) { load_cache_details(local_name, cb); },
        start_forever: ['cache', function(cb, data) {
            start_forever([data.cache], callback);
        }]
    });

};

exports.restart = function(local_name, callback) {
    var child = running_processes[local_name];
    if (!child) return callback('No process found to restart');
    child.restart();
    callback(null);
};

exports.stop = function(local_name, callback) {
    var child = running_processes[local_name];
    if (!child) return callback('No process found to stop');

    // possibly signal the child to shutdown.
    logger.info('Preparing to stop module: [' + local_name +']');
    child.once('stop', function () {
        running_processes[local_name] = null;
        callback();
    });
    if (child.send) child.send({restart: true, time: 100});
    setTimeout(function(){
        child.stop();
    });
};

function module_working_dir(local_name) {
    return path.join(working_dir, local_name);
}


function is_installed(details, callback) {
    load_cache_details(details.local_name, function(err, cache) {
        if (err) {
            // check that is just not found...
            return callback(null, false);
        }
        if (cache.module_name !== details.module_name) {
            return callback(null, false);
        }
        // lastly, if there is a module_digest, compare those for changes
        if (cache.module_digest && details.module_digest) {
            if (cache.module_digest !== details.module_digest) return callback(null, false);
        }

        return callback(null, true);

    });
}


function cache_details(local_name, details, callback) {

    init_working_dirs([details], function(err) {
        if (err) return callback(err);
        var folder = module_working_dir(local_name),
            cache  = path.join(folder, cache_name);
        fs.writeFile(cache, JSON.stringify(details, 3), callback);
    });
}


function load_cache_details(local_name, callback) {
    var folder = module_working_dir(local_name),
        cache  = path.join(folder, cache_name);
        fs.readFile(cache, function(err, data) {
            if (err) return callback(err);
            return callback(null, JSON.parse(data));
        });
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
    });
}

function get_working_dir(module_detail) {
    return path.join(working_dir, module_detail.local_name);
}

function get_package_dir(module_detail) {
    return module_detail.install_package.install_dir;
}

function get_start_script(package_dir) {
    var ss = path.join(package_dir, 'server.js');
    if (fs.existsSync(ss)) return ss;

    ss = path.join(package_dir, 'index.js');
    if (fs.existsSync(ss)) return ss;

}

function start_forever(module_details, callback) {
    async.forEach(module_details, function(module_detail, cb) {
        if (running_processes[module_detail.local_name]) {
            logger.log('WARNING: module ', module_detail.local_name, ' is already running');
            cb(null);
        }
        var working_dir = get_working_dir(module_detail),
            package_dir = get_package_dir(module_detail),
            start_script = path.resolve(get_start_script(package_dir)),
            opts = getForeverOptions(working_dir, module_detail),
            route =  (url.parse(module_detail.ddoc_url).path),
            process = forever_bind(module_detail.install_package.package_name, start_script, opts, route);
            running_processes[module_detail.local_name] = process;
        cb(null);
    }, callback);
}

function forever_bind(package, start_script, opts, route) {
    logger.info('starting package [' + package + '] with script ' + start_script);
    var child = new (forever.Monitor)(start_script, opts);
    child.once('error', function(err) {  process_error(package, err);    });
    child.once('start', function(process, data) {  process_start(package, process, data, opts);    });
    child.on('stop',  function(process) {  process_stop(package, process);    });
    child.on('restart', function() {  process_restart(package);    });
    child.once('exit', function() {  process_exit(package);    });
    child.on('stdout', function(data) {  process_stdout(package, data);    });
    child.on('stderr', function(data) {  process_stderr(package, data);    });
    child.on('message', function(data) {
        if (data.port) {
            logger.info('process [' + package + '] has bound to port ' + data.port);
            gardener_http.add_app(route, data.port);
        }
    });
    child.start();
    return child;
}


function  process_error(package, err) {
    logger.info('Error [' + package + ']', err);
}

function process_start(package, process, data, opts) {
    logger.info('starting package [' + package + '] in ' + opts.cwd );
}

function process_stop(package, process) {
    logger.info('stopping package [' + package + ']');
}

function process_restart(package) {
    logger.info('restart package [' + package + ']');
}

function process_exit(package) {
    logger.info('exit package [' + package + ']');
}

function process_stdout(package, data) {
    logger.custom(package, 'info', data.toString());
}

function process_stderr(package, data) {
    logger.custom(package, 'error', data.toString());
}




function getForeverOptions(working_dir, module_details) {
    var couch_url = manage_auth_in_url(module_details.db_url);
    var couch_server    = manage_auth_in_url(couch_root_url);

    return  {
        fork:      true,
        silent:    true,
        cwd:       working_dir,
        env: {
            COUCH_URL: couch_url,
            COUCH_DB: module_details.db_name,
            COUCH_SERVER: couch_server
        },
        stdio:     [ 'ipc', 'pipe', 'pipe' ],
        killTree:  true,
        killTTL:   0,
        minUptime: 2000
    };
}

function manage_auth_in_url(uri) {
    var user = options.get_options_value('user'),
        pass = options.get_options_value('pass');

    if (user && pass) {
        var temp = url.parse(uri);
        temp.auth = user + ':' + pass;
        return url.format(temp);
    }
    return uri;

}


