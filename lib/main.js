module.exports = Gardener;

var url = require('url'),
    async = require('async');

var npm       = require('./npm'),
    processes = require('./processes'),
    utils     = require('./utils'),
    logger    = require('./logger'),
    watchlist = require('./watchlist'),
    Watcher   = require('./watcher');


function Gardener(the_url, the_options) {
    this.base_url = the_url;
    this.options = the_options;
    this._couch_root_url = null;
    this._watch_tree = null;
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
        build_watch_tree:       ['probe_couch', gdnr.build_watch_tree.bind(gdnr)],
        watch_couch:            ['build_watch_tree', gdnr.watch_couch.bind(gdnr)]

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

    require('./http').start({
        couch_root_url : gardener._couch_root_url
    }, callback);
};

/* start the process manager */
proto.start_process_manager = function(callback) {
    var gardener = this;
    processes.start(gardener._couch_root_url, callback);
};

proto.build_watch_tree = function(callback) {
    var gardener = this;
    var includes = gardener.options.get_options_value('include');
    var excludes = gardener.options.get_options_value('exclude');
    gardener._watch_tree = watchlist(gardener.base_url, gardener._couch_root_url, includes, excludes);
    callback(null);
};

proto.watch_couch = function(callback) {
    callback();
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