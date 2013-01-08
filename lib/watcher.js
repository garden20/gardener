var follow = require('follow'),
	npm_manager = require('./npm_manager'),
	gardener_http = require('./gardener_http'),
	utils = require('./utils'),
	process_manager = require('./process_manager');

var watcher = function(garden_url) {
	this.garden_url = garden_url;
}

watcher.prototype.run = function() {
	utils.get_couch_info(this.garden_url, function(err, info){
		if (err) return console.log(err);
		console.log('couch info: ', info);


		gardener_http.start({
			couch_root_url : info.couch_root_url
		}, function(err, details) {
			if (err) console.log(err);
		});


		npm_manager.init(function(err){
			process_manager.start(function(err) {

			});
		})		
	})
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