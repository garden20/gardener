var assert = require('assert');

var generate_watch_list = require('../lib/watchlist'),
    utils = require('../lib/utils');

describe('Build watch tree', function(){
    it('should watch all dbs', function(){
        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a','b','c','d','e'];
        var includes = [];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('couch', wl.base_type);
        assert.deepEqual(['a','b','c','d','e'], wl.dbs);
    });

    it('should watch one db', function(){
        var base_url = 'http://localhost:5984/db';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['db','b','c','d','e'];
        var includes = [];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('db', wl.base_type);
        assert.deepEqual(['db'], wl.dbs);
    });

    it('should watch nothing, if db not available', function(){
        var base_url = 'http://localhost:5984/db';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a','b','c','d','e'];
        var includes = [];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('db', wl.base_type);
        assert.deepEqual([], wl.dbs);
    });

    it('should watch one design doc', function(){
        var base_url = 'http://localhost:5984/db/_design/abba';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['db','b','c','d','e'];
        var includes = [];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('design', wl.base_type);
        assert.deepEqual(['db'], wl.dbs);
    });

    it('should watch nothing, if design doc db not available', function(){
        var base_url = 'http://localhost:5984/db/_design/abba';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a','b','c','d','e'];
        var includes = [];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('design', wl.base_type);
        assert.deepEqual([], wl.dbs);
    });

    it('Exclude Filter', function(){
        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a','b','c','d','e'];
        var includes = [];
        var excludes = ["b" ,"c" , "x", "s"];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('couch', wl.base_type);
        assert.deepEqual(['a','d','e'], wl.dbs);
    });


    it('Include Filter. Only poll specified databases, core, awesome and cool, and the design doc hot in the maybe db', function(){
        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a','b','c','d','e'];
        var includes = ["b" ,"c" , "x", "s"];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('couch', wl.base_type);
        assert.deepEqual(['b','c'], wl.dbs);
    });

    it('handles ddoc includes.', function(){
        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a'];
        var includes = ['a/_design/awesome'];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);

        assert.deepEqual(['a'], wl.dbs);
        assert.deepEqual(['_design/awesome'], wl.ddocs.includes.a);
    });

    it('handles ddoc excludes with an exclude.', function(){
        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a'];
        var includes = [];
        var excludes = ['a', 'a/_design/awesome'];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);

        assert.deepEqual([], wl.dbs);
        assert.deepEqual(['_design/awesome'], wl.ddocs.excludes.a);
    });


    it('handles ddoc excludes with an exclude 2.', function(){
        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a','b'];
        var includes = ['a'];
        var excludes = ['a/_design/awesome'];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);

        assert.deepEqual(['a'], wl.dbs);
        assert.deepEqual(['_design/awesome'], wl.ddocs.excludes.a);
    });
    it('handles ddoc excludes with an exclude 3.', function(){
        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['a','b'];
        var includes = [];
        var excludes = ['a/_design/awesome'];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);

        assert.deepEqual(['a', 'b'], wl.dbs);
        assert.deepEqual(['_design/awesome'], wl.ddocs.excludes.a);
    });

    it('takes a db as a base url, and design docs includes dont need db name', function(){
        var base_url = 'http://localhost:5984/db';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['db','b','c','d','e'];
        var includes = ['_design/awesome'];
        var excludes = [];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('db', wl.base_type);
        assert.deepEqual(['db'], wl.dbs);
        assert.deepEqual(['_design/awesome'], wl.ddocs.includes.db);
    });

    it('takes a db as a base url, and design docs excludes dont need db name', function(){
        var base_url = 'http://localhost:5984/db';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['db','b','c','d','e'];
        var includes = [];
        var excludes = ['_design/awesome'];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('db', wl.base_type);
        assert.deepEqual(['db'], wl.dbs);
        assert.deepEqual(['_design/awesome'], wl.ddocs.excludes.db);
    });


    it('Mix and match 2. dbs and ddocs. Exclude always wins. In this case gardener has nothing to watch', function(){

        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['code','b','c','d','e'];
        var includes = ['code/_design/neat'];
        var excludes = ['code'];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('couch', wl.base_type);

        assert.deepEqual(['_design/neat'], wl.ddocs.includes.code);
        assert.deepEqual([], wl.dbs);
    });

    it('Mix and match 3. dbs and ddocs. Exclude the sucky design doc', function(){

        var base_url = 'http://localhost:5984/';
        var couch_url = 'http://localhost:5984/';
        var all_dbs = ['code','b','c','d','e'];
        var includes = ['code'];
        var excludes = ['code/_design/sucky'];
        var wl = generate_watch_list(base_url, couch_url, all_dbs, includes, excludes);
        assert.equal('couch', wl.base_type);

        assert.deepEqual(['_design/sucky'], wl.ddocs.excludes.code);
        assert.deepEqual(['code'], wl.dbs);
    });

});

describe('Filter ddocs from all design docs', function(){
    it('should handle an undefined filter', function(){
        var rows = [
            {id: '_design/cool'},
            {id: '_design/uncool'}
        ], filter = null;
        var finish = utils.filterDDocs(rows, filter);
        assert.equal(2, finish.length);
    });

    it('should handle an undefined includes', function(){
        var rows = [
            {id: '_design/a'},
            {id: '_design/b'}
        ], filter = {
            includes: null,
            excludes: []
        };
        var finish = utils.filterDDocs(rows, filter);
        assert.equal(2, finish.length);
    });

    it('should handle an undefined excludes', function(){
        var rows = [
            {id: '_design/a'},
            {id: '_design/b'}
        ], filter = {
            includes: [],
            excludes: null
        };
        var finish = utils.filterDDocs(rows, filter);
        assert.equal(2, finish.length);
    });

    it('should include a single ddoc', function(){
        var rows = [
            {id: '_design/cool'},
            {id: '_design/uncool'}
        ], filter = {
            includes: ['_design/cool']
        };
        var finish = utils.filterDDocs(rows, filter);
        assert.deepEqual([{'id': '_design/cool'}], finish);
    });

    it('should exclude a single ddoc', function(){
        var rows = [
            {id: '_design/cool'},
            {id: '_design/uncool'}
        ], filter = {
            excludes: ['_design/uncool']
        };
        var finish = utils.filterDDocs(rows, filter);
        assert.deepEqual([{'id': '_design/cool'}], finish);
    });

});

describe('utils', function(){
    it('should get the ddoc name', function(){
        var ddoc = 'http://localhost:5984/kujua-base/_design/kujua-base';
        var result = utils.get_ddoc_name(ddoc);
        assert.equal('kujua-base', result);
    });
});



