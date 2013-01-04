var follow = require('follow'),
	npm_manager = require('./lib/npm_manager'),
	services = require('./lib/services'),
	garden = process.env.npm_package_config_garden,
	opts = {
		include_docs : true,
		db: garden,
		since: 'now'
	},
	feed = new follow.Feed(opts);

feed.filter = function(doc, req) {
    if (!doc.type || doc.type !== 'install' ) return false;
    if (doc.removed) return false;
    return true;
}

feed.on('error', function(er) {
  //throw er;
})

feed.on('change', function(change) {
  //console.log('Doc ' + change.id, change.doc.installed.db);
})

feed.follow();
npm_manager.init(function(err){
	console.log('npm warmed started');
	services.start(function(err) {
		
	});
})

