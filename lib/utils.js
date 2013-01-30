var request = require('request'),
    async = require('async'),
    logger = require('./logger'),
    url = require('url');

exports.toBase64 = function(str) {
  return  (new Buffer(str || "", "utf8")).toString("base64");
};


exports.fromBase64 = function(str) {
  return (new Buffer(str || "", "base64")).toString("utf8");
};

exports.local_name = function(ddoc_url) {
    var temp = exports.scrub_auth_from_url(ddoc_url);
    return exports.toBase64(temp);
};

exports.scrub_auth_from_url = function(uri) {
    var temp = url.parse(uri);
    if (temp.auth) delete temp.auth;
    return url.format(temp);
};

exports.get_node_module_details = function(ddoc_url, callback) {
    request({url: ddoc_url, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {

        var digest = null;
        if (body._attachments && body._attachments[body.node_module] && body._attachments[body.node_module].digest) {
            digest = row.doc._attachments[row.doc.node_module].digest;
        }
        return callback(null, {
            module_digest : digest,
            module_name : body.node_module
        });
      }
      callback(error);
    });
};

exports.get_db_url = function(ddoc_url, callback) {
    var db_url = url.resolve(ddoc_url, '..');
    request({url: db_url, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        if (body.db_name) return callback(null, db_url);
        else return callback(new Error('Cant determine database url'));
      }
      callback(error);
    });
};

exports.get_couch_info = function(url, callback) {
    async.auto({
        couch_root_url : function(cb) { find_couch_url(url, cb); },
        dashboard_db_url : ['couch_root_url', function(cb, data) {
            find_dashboard_db_url(data.couch_root_url, cb);
        }]
    }, callback);
};

function find_couch_url(start_url, callback) {
    var suspects = possibleCouchUrls(start_url);
    async.detectSeries(suspects, is_couch_root, function(result) {
        if (!result) return callback('Cant find a couch, based on url: ' + start_url);
        callback(null, result);
    });
}

function possibleCouchUrls(start_url) {
    var results = [];
    results.push(url.resolve(start_url, '/'));
    results.push(url.resolve(start_url, '/_couch/'));
    results.push(url.resolve(start_url, '/dashboard/_design/dashboard/_couch/'));
    return results;

}


function is_couch_root(url, callback) {
    request({url: url, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        if (body.couchdb && body.couchdb === 'Welcome') return callback(true);
      }
      callback(false);
    });
}


function find_dashboard_db_url(couch_root_url, callback) {
    var suspects = possibleDashboardUrls(couch_root_url);
    async.detectSeries(suspects, is_dashboard_db, function(result) {
        // this one is not an error if not found...
        callback(null, result);
    });
}

function possibleDashboardUrls(couch_root_url) {
    var results = [];
    results.push(url.resolve(couch_root_url, '/dashboard/_design/dashboard/_rewrite/_db/'));
    results.push(url.resolve(couch_root_url, '/dashboard/'));
    return results;
}

function is_dashboard_db(url, callback) {
    request({url: url, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        if (body.db_name && body.db_name === 'dashboard') return callback(true);
      }
      callback(false);
    });
}


function is_only_db_specified(url, couch_root_url, dashboard_db_url, callback) {

}



exports.all_dbs = function(couch_root_url, callback) {
    var uri = url.resolve(couch_root_url, '_all_dbs');
    request({url: uri, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        return callback(null, body);
      }
      callback(error);
    });
};

exports.find_design_docs_with_modules = function(couch_root_url, db_name, callback) {
    var uri = url.resolve(couch_root_url, db_name + '/_all_docs?startkey=%22_design%22&endkey=%22_design0%22&include_docs=true');
    request({url: uri, json: true}, function (error, response, body) {
        if (!error || (response && response.statusCode == 200)) {
            var ddocs = [];
            if (!body.rows) {
                logger.warn('cant poll db: ['+ db_name +']', body);
                return callback(null,[]);
            }
            logger.info('Scanning design docs: ', body.rows.length);
            body.rows.forEach(function(row) {
                if (row.doc.node_module) {
                    var module_digest = null;
                    if (row.doc._attachments && row.doc._attachments[row.doc.node_module] && row.doc._attachments[row.doc.node_module].digest) {
                        module_digest = row.doc._attachments[row.doc.node_module].digest;
                    }
                    ddocs.push({
                        ddoc_id: row.id,
                        db_name: db_name,
                        module_name: row.doc.node_module,
                        module_digest: module_digest
                    });
                }
            });
            return callback(null, ddocs);
        }
        callback(error);
    });
};


