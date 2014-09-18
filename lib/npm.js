var logger = require('./logger'),
    utils = require('./utils'),
    npm = null,
    npmout = null;


exports.init = function(callback) {

    try {
        npm = require('npm');
        npm.load({
        }, function(err) {
            if (err) return callback(err);
            npmout = npm.registry.log;
            callback(null);
        });
    } catch(e) {
        // have to use the command line variant
        console.log('command line');
    }
};

exports.install = function(url, working_dir, update, callback) {

    var msgner = function(msg) {
        if (msg.level === 'silly' ||
            msg.level === 'debug' || msg.level ==='verbose' ) return;

        update(utils.scrub_auth_from_string(
          '[npm] ' + msg.prefix + ' ' + msg.message
        ));
    };

    npmout.on('log', msgner);

    logger.info(
      'Starting npm installation for',
        utils.scrub_auth_from_string(url)
    );

    npm.commands.install(working_dir, url, function (err, data) {

        // remove the npm listener
        npmout.removeListener('log', msgner);

        if (err) {
            logger.error('Module installation failed', err);
            return callback(err);
        }

        // ok, not really sure of the order of data... this is a guess for now.
        var i = data.length - 1;
        var p_details = data[i][0].split('@'),
            package_name = p_details[0],
            package_version = p_details[1],
            install_dir = data[i][1];

        logger.info(
          'Installation successful for',
            package_name + '@' + package_version
        );

        callback(null, {
            install_dir: install_dir,
            package_name: package_name,
            package_version: package_version
        });
    });
};


exports.current_details = function(package_name, callback) {
    npm.commands.view([package_name], true, function(err, details){
        if (err) return callback(err);
        var current_key = Object.keys(details)[0];
        callback(null, details[current_key]);
    });
};


exports.start = function(packages, callback) {
    npm.commands.start(packages, callback);
};


