"use strict";
var ErrorBase = require('./error_base');
var StackKeeper = require('./stack_keeper');
var compat = require('./compat');


module.exports = {
	ErrorBase: ErrorBase,
	StackKeeper: StackKeeper,
	compat: compat
};
