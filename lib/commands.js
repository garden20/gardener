module.exports = commands = {};

var url = require('url'),
	process_manager = require('./process_manager'),
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
};

commands.watch = function(args) {
	if (!args || args.length === 0) {
		console.log('USAGE: gardener watch dashboard_db_url' );
        return;
	}
	var dashboard_url = args[0];
	var opts = args.slice(1);
	options.set_options(opts);

	if (options.get_options_value('stdinpass')) {
		read_stdinpass(function(err, password) {
			dashboard_url = set_password(dashboard_url, password);
			begin_watch(dashboard_url);
		});
	} else {
		begin_watch(dashboard_url);
	}
};

function begin_watch(dashboard_url) {
	watcher = new Watcher(dashboard_url);
	watcher.run();
}

function set_password(dashboard_url, new_pass) {
	var parsed = url.parse(dashboard_url),
		user = null;

	if (parsed.auth) {
		user = parsed.auth.split(':');
	} else {
		user = options.get_options_value('user');
		if (!user) {
			console.log('Please provide a username, either via the url or -user' );
			process.exit(1);
		}
	}

	parsed.auth = user + ':' + new_pass;
	return url.format(parsed);
}

function read_stdinpass(callback) {
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function (chunk) {
		callback(null, chunk.trim());
	});
}