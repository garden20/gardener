var winston = require('winston');

winston.exitOnError = false;

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
    winston.log(level, '[' + src + '] ' + msg, meta);
};