var args = require('args'),
    cached = {},
    options = args.Options.parse([
    {
        name: 'include',
        shortName: 'i',
        help: 'Comma seperated db and design docs to include'
    },
    {
        name: 'exclude',
        shortName: 'e',
        help: 'Comma seperated db and design docs to exclude'
    },
    {
        name: 'dashboard',
        shortName: 'd',
        help: 'optional dashboard db name to follow changes.'
    },
    {
        name: "web",
        shortName: "w",
        type: 'bool',
        defaultValue: false,
        help: 'Enable local http server adding /_garden proxy in couch'
    },
    {
        name: 'host',
        shortName: 'h',
        help: 'The host name to bind the http server to.',
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
        help: 'Use upnp opening port on firewall, using the public ip',
        defaultValue: false
    },
    {
        name: 'user',
        help: 'The username passed to node modules'
    },
    {
        name: 'pass',
        help: 'The password passed to node modules'
    },
    {
        name: 'time',
        shortName: 't',
        type: 'int',
        help: 'Polling interval (seconds).',
        defaultValue: 30

    },
    {
        name: 'stdinpass',
        type: 'bool',
        help: 'read a single line from stdin, used for couch password',
        defaultValue: false
    },
    {
        name: 'logdir',
        shortName: 'l',
        help: 'specify relative or absolute directory where logs will be written',
        defaultValue: 'logs'
    }

]);

exports.set_options = function(arg_array) {
    cached = args.parser(arg_array, { start: 0 }).parse(options);
    if (cached.user && (!cached.pass && !cached.stdinpass)) throw Error('A password must be provided with the user option');
    if (!cached.user && cached.pass) throw Error('A user must be provided with the password option');
};

exports.get_options = function() {
    return cached;
};

exports.get_options_value = function(name) {
    return cached[name];
};


exports.getHelp = function() {
    return  options.getHelp();
};