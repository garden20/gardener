var args = require('args'),
	cached = {},
	options = args.Options.parse([
	{
		name: "web",
		shortName: "w",
		type: 'bool',
		defaultValue: true,
		help: 'Turn on a local http server and add turn on the /_garden proxy to it from couch'
	},
	{
		name: 'host',
		shortName: 'h',
		help: 'The host name (or IP address) to bind the http server to.',
		defaultValue: 'localhost'
	},
	{
		name: 'port',
		type: 'int',
		shortName: 'p',
		help: 'The port to bind the http server to.',
		defaultValue: 25984
	},
    {
        name: 'upnp',
        type: 'bool',
        help: 'Use upnp to open the port on the firewall, and use the public ip',
        defaultValue: false
    },
	{
		name: 'user',
		help: 'The username given to the node module for connecting to couch'
	},
	{
		name: 'pass',
		help: 'The password given to the node module for connecting to couch'
	},
	{
		name: 'time',
		shortName: 't',
		type: 'int',
		help: 'Polling interval (seconds) to check couch for changes to design docs',
		defaultValue: 30

	},
	{
		name: 'stdinpass',
		type: 'bool',
		help: 'when specified, gardener will read a single line from stdin, which will be used as the password when connecting to couch',
		defaultValue: false
	}

]);

exports.set_options = function(arg_array) {
	cached = args.parser(arg_array, { start: 0 }).parse(options);
	if (cached.user && !cached.pass) throw Error('A password must be provided with the user option');
	if (!cached.user && cached.pass) throw Error('A user must be provided with the password option');
}

exports.get_options = function() {
	return cached;
}

exports.get_options_value = function(name) {
	return cached[name];
}


exports.getHelp = function() {
	return	options.getHelp();
}