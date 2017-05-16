var request = require('request'),
    async = require('async'),
    _ = require('underscore'),
    logger = require('./logger'),
    url = require('url');


exports.toBase64 = function(str) {
  return  (new Buffer(str || "", "utf8")).toString("base64");
};


exports.fromBase64 = function(str) {
  return (new Buffer(str || "", "base64")).toString("utf8");
};


exports.is_tgz = function(module_name) {
    var suffix = '.tgz';
    if(module_name) {
        return (module_name.indexOf(suffix, module_name.length - suffix.length) !== -1);
    }
    return false;
};


exports.local_name = function(ddoc_url, module_name) {
    var parts = [ exports.scrub_auth_from_url(ddoc_url) ];
    if (module_name) {
        parts.push(exports.scrub_version_from_name(module_name));
    }
    return exports.toBase64(parts.join('/'));
};


exports.scrub_version_from_name = function(module_name) {
    if (exports.is_tgz(module_name)) {
        return module_name.substr(0, module_name.lastIndexOf('-'));
    }
    return module_name.split('@')[0];
};


exports.scrub_auth_from_url = function(uri) {
    var temp = url.parse(uri);
    if (temp.auth) delete temp.auth;
    return url.format(temp);
};


exports.scrub_auth_from_string = function(string) {
    return string.replace(
      /(https?:\/\/[^:]+:)[^@]+@/g, '$1******@'
    );
};


exports.get_node_modules_details = function(ddoc_url, callback) {
    request({url: ddoc_url, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {

        var results = [];

        var node_modules = body.node_modules || body.node_module;
        if (node_modules) {
            var multi_modules = node_modules.split(',');

            multi_modules.forEach(function(module) {

                module = module.trim(module);

                var module_digest = null;
                if (body._attachments && body._attachments[module] && body._attachments[module].digest) {
                    module_digest = body._attachments[module].digest;
                }
                results.push({
                    ddoc_id: body._id,
                    ddoc_url: ddoc_url,
                    module_name: module,
                    module_digest: module_digest,
                    start_immediate: true
                });
            });
        }
        return callback(null, results);
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

exports.get_ddoc_name = function(ddoc_url) {
    var parts = ddoc_url.split('/');
    return parts[parts.length - 1];
};

// kind of a lame dupe of above.
exports.get_db_name = function(ddoc_url, callback) {
    var db_url = url.resolve(ddoc_url, '..');
    request({url: db_url, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        if (body.db_name) return callback(null, body.db_name);
        else return callback(new Error('Cant determine database name'));
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


exports.all_dbs = function(couch_root_url, callback) {
    var uri = url.resolve(couch_root_url, '_all_dbs');
    request({url: uri, json: true}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        return callback(null, body);
      }
      callback(error);
    });
};


exports.find_design_docs_with_modules = function(couch_root_url, db_name, ddoc_filter, callback) {
    var uri = url.resolve(couch_root_url, db_name + '/_all_docs?startkey=%22_design%22&endkey=%22_design0%22&include_docs=true');
    request({url: uri, json: true}, function (error, response, body) {
        if (!error || (response && response.statusCode == 200)) {
            var ddocs = [];
            if (!body.rows) {
                logger.warn('cant poll db: ['+ db_name +']', body);
                return callback(null,[]);
            }
            logger.info('Scanning design docs on ' + db_name);
            var filtered = exports.filterDDocs(body.rows, ddoc_filter);
            filtered.forEach(function(row) {

                var node_modules = row.doc.node_modules || row.doc.node_module;
                if (node_modules) {
                    var multi_modules = node_modules.split(',');

                    multi_modules.forEach(function(module) {

                        module = module.trim(module);

                        var module_digest = null;
                        if (row.doc._attachments && row.doc._attachments[module] && row.doc._attachments[module].digest) {
                            module_digest = row.doc._attachments[module].digest;
                        }
                        logger.info(row.id + ' on db ' + db_name + ' has a module ' + module);
                        ddocs.push({
                            ddoc_id: row.id,
                            db_name: db_name,
                            module_name: module,
                            module_digest: module_digest
                        });
                    });
                }
            });
            return callback(null, ddocs);
        }
        callback(error);
    });
};


exports.filterDDocs = function(rows, ddoc_filter) {
    if (!rows) return [];
    return _.filter(rows, function(row){
        if (!ddoc_filter) return true;
        if (ddoc_filter.includes && ddoc_filter.includes.length > 0) {
            if (! _.contains(ddoc_filter.includes, row.id)) return false;
        }
        if (ddoc_filter.excludes && ddoc_filter.excludes.length > 0) {
            if ( _.contains(ddoc_filter.excludes, row.id)) return false;
        }

        return true;
    });
};


