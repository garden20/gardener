module.exports = Gardener;

var url = require('url'),
    async = require('async'),
    _ = require('underscore');

var npm       = require('./npm'),
    processes = require('./processes'),
    utils     = require('./utils'),
    logger    = require('./logger'),
    poll   = require('./poll'),
    dbchange = require('./dbchange'),
    dashboard = require('./dashboard'),
    http;


function Gardener(the_url, the_options) {
    this.base_url = the_url;
    this.options = the_options;
    this._couch_root_url = null;
    this._poll_interval = null;
}

var cons = Gardener,
    proto = cons.prototype;

proto.start = function(callback) {
    var gdnr = this;
    async.auto({

        optional_password_set : [gdnr.optional_password_set.bind(gdnr)],
        init_npm:               [gdnr.init_npm.bind(gdnr)],
        probe_couch:            ['optional_password_set', gdnr.probe_couch.bind(gdnr)],
        optional_start_http:    ['probe_couch', gdnr.optional_start_http.bind(gdnr)],
        start_process_manager:  ['probe_couch', gdnr.start_process_manager.bind(gdnr)],
        watch_couch:            ['optional_start_http', 'start_process_manager', gdnr.watch_couch.bind(gdnr)]

    }, callback);
};

/*  If the user has specified a stdin password, read it and alter the base url with it  */
proto.optional_password_set = function(callback) {
    var gardener = this;
    if (!gardener.options.get_options_value('stdinpass')) return callback();

    read_stdinpass(function(err, password) {
        gardener.base_url = set_password(gardener.base_url, password, gardener.options);
        callback();
    });

};

/* Find out about the couch based on the url give to us */
proto.probe_couch = function(callback) {
    var gardener = this;
    utils.get_couch_info(gardener.base_url, function(err, info){
        if (err) {
            logger.error(err);
            process.exit(1);
        }
        gardener._couch_root_url = info.couch_root_url;
        callback();
    });
};

/* start the npm service */
proto.init_npm = function(callback) {
    npm.init(callback);
};


/* start the http service if the user asked for it */
proto.optional_start_http = function(callback) {
    var gardener = this;

    if (!gardener.options.get_options_value('web')) return callback();

    http = require('./http');
    http.start({
        couch_root_url : gardener._couch_root_url
    }, callback);
};

/* start the process manager */
proto.start_process_manager = function(callback) {
    var gardener = this;
    var dashboard_db = this.options.get_options_value('dashboard');
    processes.start(gardener._couch_root_url, dashboard_db, http, callback);
};


proto.watch_couch = function(callback) {
    var gardener = this;

    var include = this.options.get_options_value('include');
    if (!include) include = [];
    else include = include.split(',');

    var exclude = this.options.get_options_value('exclude');
    if (!exclude) exclude = [];
    else exclude = exclude.split(',');

    var dashboard_db = this.options.get_options_value('dashboard');
    var time = this.options.get_options_value('time') * 1000;

    gardener.watching_dbs = {};

    var run_it = function() {
        poll(gardener._couch_root_url, gardener.base_url, include, exclude, dashboard_db, function(err, tree){
            gardener.after_poll(err, tree);
        });
    };

    gardener._poll_interval = setInterval(run_it, time);
    run_it();


    if (dashboard_db) {
        dashboard(gardener._couch_root_url, dashboard_db);
    }

    callback();
};


proto.after_poll = function(err, tree) {
    if (err) return logger.error('There was a problem polling the couch', err);
    var gardener = this,
        all = [];

    if (!tree.dbs || tree.dbs.length === 0) return;

    var existing_dbs = _.keys(gardener.watching_dbs),
        new_dbs      = _.difference(tree.dbs, existing_dbs),
        removed_dbs  = _.difference(existing_dbs, tree.dbs);


    async.eachLimit(new_dbs, 1, function(db_name, cb){

        // skip the built in ones....prob should re think this.
        if (db_name.indexOf('_') === 0) return cb();

        var filter = {
            includes: tree.ddocs.includes[db_name] || [],
            excludes: tree.ddocs.excludes[db_name] || []
        };
        gardener.watching_dbs[db_name] = dbchange(gardener._couch_root_url, db_name, filter);
        // give some breathing room to couch
        setTimeout(cb, 100);

    }, function(err){ });

    _.each(removed_dbs, function(db_name){
        logger.info('un-watching db ' + db_name + '');
        var removed = gardener.watching_dbs[db_name];
        removed.stop();

        // stop all processes on this db.
        processes.uninstall_db(db_name, function(err){
            if (err) logger.error('Problem stopping processeses for ' + db_name + ' ', err);
        });
        delete gardener.watching_dbs[db_name];
    });

};


function set_password(base_url, new_pass, options) {
    var parsed = url.parse(base_url),
        user = null;

    if (parsed.auth) {
        user = parsed.auth.split(':');
    } else {
        user = options.get_options_value('user');
        if (!user) {
            console.log('Please provide a username, either via the url or -user' );
            process.exit(1);
        }
    }

    parsed.auth = user + ':' + new_pass;
    return url.format(parsed);
}

function read_stdinpass(callback) {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) {
        callback(null, chunk.trim());
    });
}