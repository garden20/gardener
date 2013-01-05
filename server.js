var garden_url = process.env.npm_package_config_garden,
	Watcher = require('./lib/watcher'),
	watcher = new Watcher(garden_url);

watcher.run();