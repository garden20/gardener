"use strict";
var inherits = require('util').inherits;
var ErrorBaseStd = require('../error_base');


var ErrorBase = function () {
	ErrorBaseStd.call(this);
};
inherits(ErrorBase, ErrorBaseStd);

ErrorBase.prototype.createStackKeeper = function () {
	return new Error();
};

ErrorBase.prototype.getStackTrace = function () {
	return [this.toString(), this.stackKeeper.stack].join('\n');
};


module.exports = ErrorBase;
