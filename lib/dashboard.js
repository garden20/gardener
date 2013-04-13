module.exports = dashboard;

var follow = require('follow'),
    url = require('url'),
    utils = require('./utils'),
    logger = require('./logger'),
    processes = require('./processes');


function dashboard(couch_url, db) {
    var dashboard_db_url = url.resolve(couch_url, db);
    opts = {
            include_docs : true,
            db: dashboard_db_url,
            since: 'now'
        },
        feed = new follow.Feed(opts);

    feed.filter = app_filter;
    feed.on('error', function(er) {
      //throw er;
    });

    feed.on('change', function(change) {
        var db_url = url.resolve(couch_url, change.doc.installed.db);
        var ddoc_url = to_ddoc_url(couch_url, change.doc.installed.db, '_design/' + change.doc.doc_id);
        utils.get_node_modules_details(ddoc_url,  function(err, modules) {
            modules.forEach(function(module){
                module.couch_root_url =  couch_url;
                module.db_name = change.doc.installed.db;
                module.db_url = url.resolve(couch_url, change.doc.installed.db);
                processes.install(module);
            });
        });
    });
    logger.info('watching db '+ db +' for new installations/updates.');
    feed.follow();
}

function app_filter(doc, req) {
    if (!doc.type || doc.type !== 'install' ) return false;
    return true;
}

function to_ddoc_url(couch_root_url, db_name, doc_id) {
    return url.resolve(couch_root_url, db_name + '/' + doc_id);
}