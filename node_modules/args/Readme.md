## args

`args` is command line arguments parser for node.js

Instead of trying to deal with all your complex cases, `args` provides a tool to help you with arguments parsing.

## features

Supported syntax for options: `--option=value`, `--option value`, `-abc`, `-abc value`

For boolean flags, `true` value can be omitted, i.g. `-f true` can be replaced with `-f` (and `--flag true` with `--flag` also).

## option properties

* name
* shortName
* key
* type
	* `no value` - str
	* enum
	* bool
	* int
	* float
	* date
	* datetime
* isList
* enumItems
* enumHelp
* required
* defaultValue
* help

## usage example

```js
var args = require('args');

var options = args.Options.parse([
	{
		name: 'option',
		shortName: 'o',
		type: 'int',
		help: 'some option'
	}
]);

console.log(options.getHelp()); // shows help

var argv = 'node app.js --option 11'.split(' ');
var parsed = args.parser(argv).parse(options);
console.log(parsed); // {option: 11}
```
