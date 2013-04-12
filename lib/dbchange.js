module.exports = dbchange;

var follow = require('follow'),
    url = require('url'),
    utils = require('./utils'),
    logger = require('./logger'),
    processes = require('./processes');


function dbchange(couch_url, db, filter) {
    var db_url = url.resolve(couch_url, db);
    opts = {
            db: db_url,
            since: 'now'
        },
        feed = new follow.Feed(opts);

    feed.on('error', function(er) {

        if (er.deleted) {
            logger.info('[' + db +'] database deleted.');
            // the db was deleted. Delete all processes.
            processes.uninstall_db(db, function(err){
                if (err) logger.error('Problem stopping processeses for ' + db + ' ', err);
            });
        } else {
            logger.error('DB: ' + db + ' follow error ' + er, er);
        }

      //throw er;
    });

    feed.on('change', function(change) {
        var change_doc = {
            _id: change.id,
            _rev: change.changes[0].rev
        };
        if (!ddoc_filter(change_doc)) return;

        var ddoc_url = to_ddoc_url(couch_url, db, change_doc._id);

        var filtered = utils.filterDDocs([change_doc], filter, '_id');
        if (filtered.length === 0) return; // the one change was filtered

        if (change.deleted) {
            processes.uninstall_ddoc(ddoc_url, function(err){
                if (err) logger.error('Problem stopping processeses for ' + ddoc_url + ' ', err);
            });
        } else {
            utils.get_node_modules_details(ddoc_url,  function(err, modules) {
                if (err) return logger.info('error fetch ddoc info for ' + ddoc_url, err);
                modules.forEach(function(module){
                    module.couch_root_url =  couch_url;
                    module.db_name = db;
                    module.db_url = url.resolve(couch_url, db);
                    processes.install(module, function(err){
                        if (err) logger.error('Error:', err);
                    });
                });
            });
        }

    });
    logger.info('watching db ['+ db +']');
    feed.follow();
    return feed;
}

function ddoc_filter(doc, req) {
    try {
        if ( doc._id.split('/')[0] === '_design' ) return true;
    } catch (e) {}
    return false;
}

function to_ddoc_url(couch_root_url, db_name, doc_id) {
    return url.resolve(couch_root_url, db_name + '/' + doc_id);
}