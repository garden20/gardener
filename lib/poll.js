module.exports = poll;

var async = require('async'),
    url = require('url'),
    watchlist = require('./watchlist'),
    logger = require('./logger'),
    utils = require('./utils'),
    process_manager = require('./processes');


function poll(couch_url, base_url, includes, excludes, dashboard) {
    logger.info('polling couch for design doc changes.');
    async.auto({

        all_dbs : function(cb){ utils.all_dbs( couch_url, cb); },
        tree: ['all_dbs', function(cb, data) {
            var wl = watchlist(base_url, couch_url, data.all_dbs, includes, excludes);
            cb(null, wl);
        }],
        dashboard: function(cb) {
            utils.dashboard_apps(couch_url, dashboard, cb);
        },
        modules: ['tree', function(cb, data) {
            ddocs_with_modules(couch_url, data.tree, function(err, results) {
                cb(err, results);
            });
        }],
        install: ['modules', function(cb, data){
            console.log(data.modules);
            cb(null);
        }]
    },function(err, data){
        if (err) {
            logger.error('polling failed.', err);
        }
    });
}





function ddocs_with_modules(couch_root_url, tree, callback) {
    var all = [];
    if (!tree.dbs || tree.dbs.length === 0) return callback(null, all);
    async.forEachLimit(tree.dbs, 1, function(db_name, cb) {
        var filter = {
            includes: tree.ddocs.includes[db_name] || [],
            excludes: tree.ddocs.excludes[db_name] || []
        };

        utils.find_design_docs_with_modules(couch_root_url, db_name, filter, function(err, info){
            all = all.concat(info);
            return cb(null);
        });
    }, function(err) {
        callback(err, all);
    });
}
