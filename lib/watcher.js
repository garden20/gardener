var follow = require('follow'),
	npm_manager = require('./npm_manager'),
	gardener_http = require('./gardener_http'),
	process_manager = require('./process_manager');

var watcher = function(garden_url) {
	this.garden_url = garden_url;
}

watcher.prototype.run = function() {

	this.start_web();

	npm_manager.init(function(err){
		process_manager.start(function(err) {

		});
	})	
};


watcher.prototype.start_web = function() {
	gardener_http.start({
		couch_root_url : this.garden_url
	});
};


watcher.prototype.start_dashboard_watch = function() {
	var opts = {
		include_docs : true,
		db: this.garden_url,
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


module.exports = watcher;