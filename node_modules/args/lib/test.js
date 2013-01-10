"use strict";
var args = require('./');


var test = function () {
	var opts = args.Options.parse([
		{
			name: 'xx',
			shortName: 'x'
		},
		{
			name: 'yy',
			shortName: 'y',
			type: 'bool'
		}
	]);

	//var argv = [null, null, '-x', 'y'];
	var argv = process.argv;

	console.log(args.parse(opts));
};

test();
