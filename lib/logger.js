var winston = require('winston'),
    path    = require('path'),
    fs      = require('fs'),
    mkdirp  = require('mkdirp'),
    categories = {};
    logdir  = 'logs';


winston.exitOnError = false;

exports.init = function(options) {
    logdir = options.get_options_value('logdir');
    setupDir(logdir);
};

exports.info = function(msg, meta) {
    exports.custom('gardener','info', msg, meta);
};

exports.warn = function(msg, meta) {
    exports.custom('gardener','warn', msg, meta);
};

exports.error = function(msg, meta) {
    exports.custom('gardener','error', msg, meta);
};

exports.custom = function(src, level, msg, meta) {
    var category = getLogger(src);
    category.log(
      level, msg, (meta === undefined ? '' : meta)
    );
};

function setupDir(dir) {
    if (!fs.existsSync(dir)) {
        mkdirp.sync(dir);
    }
}

function getLogger(src) {

    if (categories[src]) {
        return winston.loggers.get(src);
    }

    winston.loggers.add(src, {
        console: {
            silent: true
        },
        file: {
            filename: path.join(logdir, src + '.log'),
            timestamp: true,
            colorize: false,
            json: false,
            maxsize: 1000000,
            maxFiles: 3
        }
    });

    categories[src] = true;
    return winston.loggers.get(src);
}

