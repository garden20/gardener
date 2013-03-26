var follow = require('follow'),
    async = require('async'),
    url = require('url'),
    logger = require('./logger'),
    npm_manager = require('./npm'),
    gardener_http = require('./http'),
    options = require('./options'),
    utils = require('./utils'),
    process_manager = require('./processes');

var watcher = function(base_url) {
    this.base_url = base_url;
    this.couch_root_url = null;
    this.dashboard_db_url = null;
    this.start_http = options.get_options_value('web');
    this.poll_interval = null;
    this.poll_time = options.get_options_value('time') * 1000; // every thirty seconds

};

watcher.prototype.run = function() {
    var self = this;
    utils.get_couch_info(this.base_url, function(err, info){
        if (err) {
            logger.error(err);
            process.exit(1);
        }
        self.couch_root_url = info.couch_root_url;
        self.dashboard_db_url = info.dashboard_db_url;

        if (self.start_http) {
            gardener_http.start({
                couch_root_url : info.couch_root_url
            }, function(err, details) {
                if (err) logger.error(err);
            });
        }



        npm_manager.init(function(err){
            process_manager.start(info.couch_root_url, function(err) {

                var force_poll = options.get_options_value('poll');
                if (!force_poll && self.dashboard_db_url) {
                    self.start_dashboard_watch();
                } else {
                    self.start_couch_poll();
                }
            });
        });
    });
};



watcher.prototype.start_dashboard_watch = function() {
    var self = this,
        opts = {
            include_docs : true,
            db: this.dashboard_db_url,
            since: 'now'
        },
        feed = new follow.Feed(opts);

    feed.filter = app_filter;
    feed.on('error', function(er) {
      //throw er;
    });

    feed.on('change', function(change) {
        var db_url = url.resolve(self.couch_root_url, change.doc.installed.db);
        var ddoc_url = to_ddoc_url(self.couch_root_url, change.doc.installed.db, '_design/' + change.doc.doc_id);
        process_manager.install({
            couch_root_url: self.couch_root_url,
            db_name: change.doc.installed.db,
            ddoc_url: ddoc_url,
            start_immediate: true
        }, function(err){
            if (err) logger.error('Error:', err);
        });
    });
    logger.info('watching dashboard db for new installations/updates.');
    feed.follow();
};

function app_filter(doc, req) {
    if (!doc.type || doc.type !== 'install' ) return false;
    return true;
}


watcher.prototype.start_couch_poll = function() {
    var self = this;
    poll(self.couch_root_url);
    self.poll_interval = setInterval(function(){
        poll(self.couch_root_url);
    }, self.poll_time);
};


function poll(couch_root_url) {
    logger.info('polling couch for design doc changes.');
    async.auto({
        all_dbs : function(cb){ utils.all_dbs( couch_root_url, cb); },
        modules: ['all_dbs', function(cb, data) {
            ddocs_with_modules(couch_root_url, data.all_dbs, function(err, results) {
                cb(err, results);
            });
        }],
        install: ['modules', function(cb, data) {
            data.modules.forEach(function(module) {
                if (!module) return;
                process_manager.install({
                    couch_root_url: couch_root_url,
                    db_name: module.db_name,
                    db_url: url.resolve(couch_root_url, module.db_name),
                    module_name: module.module_name,
                    module_digest: module.module_digest,
                    ddoc_url: to_ddoc_url(couch_root_url, module.db_name, module.ddoc_id),
                    start_immediate: true
                }, function(err, details) {

                });
            });
        }]
    },function(err, data){
        if (err) {
            logger.error('polling failed.', err);
        }
    });
}



function to_ddoc_url(couch_root_url, db_name, doc_id) {
    return url.resolve(couch_root_url, db_name + '/' + doc_id);
}


function ddocs_with_modules(couch_root_url, all_dbs, callback) {
    var all = [];
    if (!all_dbs || all_dbs.length === 0) return callback(null, all);
    async.forEachLimit(all_dbs, 1, function(db_name, cb) {
        utils.find_design_docs_with_modules(couch_root_url, db_name, function(err, info){
            all = all.concat(info);
            return cb(null);
        });
    }, function(err) {
        callback(err, all);
    });
}

module.exports = watcher;