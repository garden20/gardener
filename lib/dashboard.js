module.exports.follow = start;
module.exports.is_dashboard_managed = is_dashboard_managed;

var follow = require('follow'),
    url = require('url'),
    request = require('request'),
    utils = require('./utils'),
    logger = require('./logger'),
    processes = require('./processes');


function start(couch_url, db) {
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
                processes.install({
                    couch_root_url: couch_url,
                    db_name: change.doc.installed.db,
                    db_url: url.resolve(couch_url, change.doc.installed.db),
                    force_install: true
                });
            });
        });
    });
    logger.info('watching db '+ db +' for new installations/updates.');
    feed.follow();
}

function is_dashboard_managed(couch_url, db, module_name, callback) {
    if (!db) {
        return callback(null, false);
    }
    var ddoc_url = url.resolve(couch_url, db + '/_design/' + db + '/_view/by_active_install');
    request({url: ddoc_url, json: true}, function (error, response, body) {
        if (error) {
            return callback(error);
        }
        if (response.statusCode != 200) {
            return callback('Unspecified error');
        }
        var found = false;
        if (body.rows) {
            body.rows.forEach(function(row) {
                if (row.key === module_name) {
                    found = true;
                }
            });
        }
        return callback(null, found);
    });
}

function app_filter(doc, req) {
    return doc.type === 'install';
}

function to_ddoc_url(couch_root_url, db_name, doc_id) {
    return url.resolve(couch_root_url, db_name + '/' + doc_id);
}