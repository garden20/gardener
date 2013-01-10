module.exports = commands = {};

var process_manager = require('./process_manager'),
	options = require('./options'),
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
	var opts = args.slice(1);
	options.set_options(opts);
	watcher = new Watcher(dashboard_url);
	watcher.run();
}