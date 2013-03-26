module.exports = dashboard;

var follow = require('follow'),
    url = require('url'),
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
        processes.install({
            couch_root_url: self.couch_root_url,
            db_name: change.doc.installed.db,
            ddoc_url: ddoc_url,
            start_immediate: true
        }, function(err){
            if (err) logger.error('Error:', err);
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