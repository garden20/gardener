module.exports = generate_watch_list;

var _ = require('underscore');


function path_type(path) {
    if (!path || path.length ===0) return 'couch';

    if (path.indexOf('_design') > 0 ) return 'design';

    var parts = path.split('/');
    if (parts.length === 1) return 'db';
}


function ddoc_db(path) {
    var parts = path.split('/');
    if (parts[0] === '_design') return null;
    return parts[0];
}

function ddoc_id(path) {
    var parts = path.split('/');
    return parts.slice(1).join('/');
}

function split_db_ddocs(names, default_db) {
    var results = {
        dbs: [],
        ddocs: {}
    };

    _.each(names, function(path){
        var type =  path_type(path);
        if (type === 'db') return results.dbs.push(path);
        var db = ddoc_db(path);
        if (db) {
            var doc_id = ddoc_id(path);
            if (doc_id && doc_id.length > 0) {
                results.ddocs[db] = doc_id;
                return;
            }
        }
        if (default_db) {
            // we assume that the path in this case is just the id
            results.ddocs[default_db] = path;
            return;
        }

    });
    results.dbs = _.uniq(results.dbs);
    return results;
}


function generate_watch_list(base_url, couch_root_url, all_dbs, includes, excludes) {

    // base is the path difference between the base_url and the couch_root_url
    var base = base_url.substring(couch_root_url.length);
    var result = {
        couch_root_url : couch_root_url,
        base: base,
        base_type : path_type(base),
        dbs: all_dbs,
        ddocs: {
            includes: {},
            excludes: {}
        }
    };

    var default_db = null;

    if (result.base_type === 'db') {
        all_dbs = _.intersection([result.base], all_dbs);
        default_db = result.base;
    }

    if (result.base_type === 'design') {
        var db = ddoc_db(result.base);
        all_dbs = _.intersection([db], all_dbs);
        default_db = db;
    }


    var incl = split_db_ddocs(includes, default_db);
    result.ddocs.includes = incl.ddocs;
    if (incl.dbs.length > 0) {
        all_dbs = _.intersection(all_dbs, incl.dbs);
    } else {
        var keys = _.keys(result.ddocs.includes);
        if (keys && keys.length > 0) {
            all_dbs = _.intersection(all_dbs, keys);
        }
    }


    var excl = split_db_ddocs(excludes, default_db);
    result.ddocs.excludes = excl.ddocs;
    if (excl.dbs.length > 0) {
        all_dbs = _.difference(all_dbs, excl.dbs);
    }





    result.dbs = all_dbs;

    return result;
}