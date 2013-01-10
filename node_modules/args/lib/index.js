"use strict";
var Parser = require('./parser');
var errors = require('./errors');
var Option = require('./option');
var Options = require('./options');


module.exports = {
	Parser: Parser,
	errors: errors,
	Option: Option,
	Options: Options,
	parser: Parser.parser,
	parse: Parser.parse,
	parseToPositional: Parser.parseToPositional,
	parseOptions: Parser.parseOptions,
	parseOptionsFirst: Parser.parseOptionsFirst
};
