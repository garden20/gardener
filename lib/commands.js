module.exports = commands = {};

var process_manager = require('./process_manager'),
	Watcher = require('./watcher');

commands.install = function(args) {
	if (!args || args.length === 0) {
		console.log('USAGE: gardener install url' );
        return;
	}
	var ddoc_url = args[0];
	process_manager.install(ddoc_url, function(err) {

	});
}

commands.watch = function(args) {
	if (!args || args.length === 0) {
		console.log('USAGE: gardener watch dashboard_db_url' );
        return;
	}
	var dashboard_url = args[0];	
	watcher = new Watcher(dashboard_url);
	watcher.run();
}