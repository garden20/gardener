module.exports = poll;

var async = require('async'),
    url = require('url'),
    request = require('request'),
    watchlist = require('./watchlist'),
    logger = require('./logger'),
    utils = require('./utils'),
    process_manager = require('./processes');


function poll(couch_url, base_url, includes, excludes, dashboard, force) {
    logger.info('polling couch for design doc changes.');
    async.auto({
        all_dbs: function(cb) {
            utils.all_dbs(couch_url, cb);
        },
        tree: ['all_dbs', function(cb, data) {
            cb(null, watchlist(base_url, couch_url, data.all_dbs, includes, excludes));
        }],
        modules: ['tree', function(cb, data) {
            ddocs_with_modules(couch_url, data.tree, cb);
        }],
        install: ['modules', function(cb, data) {
            data.modules.forEach(function(module) {
                if (!module) return;
                process_manager.install({
                    couch_root_url: couch_url,
                    db_name: module.db_name,
                    db_url: url.resolve(couch_url, module.db_name),
                    module_name: module.module_name,
                    module_digest: module.module_digest,
                    ddoc_url: to_ddoc_url(couch_url, module.db_name, module.ddoc_id),
                    start_immediate: true,
                    force_install: force
                });
            });
            cb();
        }],
        check: ['install', function(cb) {
            process_manager.list(cb);
        }],
        remove_poll: ['check', function(cb, data) {
            remove_poll(data.check, cb);
        }],
        remove: ['remove_poll', function(cb, data) {
            data.remove_poll.forEach(function(module){
                process_manager.uninstall(module.local_name, module);
            });
            cb();
        }]
    }, function(err, data) {
        if (err) {
            logger.error('polling failed.', err);
        }
    });
}


function remove_poll(modules, callback) {
    var to_remove = [];
    async.each(modules, function(module, cb){
        var url = module.ddoc_url;
        request.head(url, function(err, resp){
            /*
             * Ignore errors and only remove modules if we get a 404.
             */
            if (resp && resp.statusCode === 404) {
                to_remove.push(module);
            }
            cb();
        });
    }, function(err){
        callback(err, to_remove);
    });
}


function ddocs_with_modules(couch_root_url, tree, callback) {
    var all = [];
    if (!tree.dbs || tree.dbs.length === 0) {
        return callback(null, all);
    }
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

function to_ddoc_url(couch_root_url, db_name, doc_id) {
    return url.resolve(couch_root_url, db_name + '/' + doc_id);
}
