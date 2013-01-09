var follow = require('follow'),
	async = require('async'),
	url = require('url'),
	logger = require('./logger'),
	npm_manager = require('./npm_manager'),
	gardener_http = require('./gardener_http'),
	utils = require('./utils'),
	process_manager = require('./process_manager');

var watcher = function(base_url) {
	this.base_url = base_url;
	this.couch_root_url = null;
	this.dashboard_db_url = null;
	this.start_http = true;
	this.poll_interval;
	this.poll_time = 1000 * 30 * 1; // every thirty seconds

}

watcher.prototype.run = function() {
	var self = this;
	utils.get_couch_info(this.base_url, function(err, info){
		if (err) return logger.error(err);
		self.couch_root_url = info.couch_root_url;
		self.dashboard_db_url = info.dashboard_db_url;

		if (self.start_http) {
			gardener_http.start({
				couch_root_url : info.couch_root_url
			}, function(err, details) {
				if (err) logger.error(err);
			});
		}



		npm_manager.init(function(err){
			process_manager.start(function(err) {

				self.start_couch_poll();

			});
		})		
	})
};



watcher.prototype.start_dashboard_watch = function() {
	var opts = {
		include_docs : true,
		db: this.dashboard_db_url,
		since: 'now'
	},
	feed = new follow.Feed(opts);	
	feed.filter = app_filter;

	feed.on('error', function(er) {
	  //throw er;
	})

	feed.on('change', function(change) {
	  //console.log('Doc ' + change.id, change.doc.installed.db);
	})

	feed.follow();
};

function app_filter(doc, req) {
	if (!doc.type || doc.type !== 'install' ) return false;
    return true;
}


watcher.prototype.start_couch_poll = function() {
	var self = this;
	poll(self.couch_root_url);
	self.poll_interval = setInterval(function(){ 
		poll(self.couch_root_url);
	}, self.poll_time);
};


function poll(couch_root_url) {
	logger.info('polling couch for design doc changes.');
	async.auto({
		all_dbs : function(cb){ utils.all_dbs( couch_root_url, cb) },
		modules: ['all_dbs', function(cb, data) {  
			ddocs_with_modules(couch_root_url, data.all_dbs, function(err, results) {
				cb(err, results);
			})
		}],
		install: ['modules', function(cb, data) {
			data.modules.forEach(function(module) {
				process_manager.install({
					couch_root_url: couch_root_url,
					db_url: url.resolve(couch_root_url, module.db_name),
					module_name: module.module_name,
					module_digest: module.module_digest,
					ddoc_url: to_ddoc_url(couch_root_url, module.db_name, module.ddoc_id),
					start_immediate: true
				}, function(err, details) {

				});	
			})
		}]
	});	
}



function to_ddoc_url(couch_root_url, db_name, doc_id) {
	return url.resolve(couch_root_url, db_name + '/' + doc_id);
}


function ddocs_with_modules(couch_root_url, all_dbs, callback) {
	var all = [];
	if (!all_dbs || all_dbs.length == 0) return callback(null, all);
	async.forEachLimit(all_dbs, 2, function(db_name, cb) {
		utils.find_design_docs_with_modules(couch_root_url, db_name, function(err, info){
			all = all.concat(info);
			return cb(null);
		});		
	}, function(err) {
		callback(err, all);
	});	
}

module.exports = watcher;