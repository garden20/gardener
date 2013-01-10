# nerr

Using custom errors is kinda tricky in JS. Unfortunately, it is not enough to just inherit your class from Error. You need to do really strange things to provide stack trace with your error objects.

**nerr** fixes this problem by providing ErrorBase class. By inheriting it you're getting correct error implementation with stack trace included.

ErrorBase features:

* Inherited from Error, all your error objects will be instances of Error
* Fully Error-compatible, mimics all it's properties, code working with Error will also work with classes inherited from ErrorBase
* `message` is getter, not just string property - override getMessage() to construct message you need using any of your error's properties

## How to use

* Inherit from ErrorBase
* Don't forget to call superclass constructor in your constructor
* Override prototype.name by setting it to your class name
* Override getMessage() to provide error message

Note, that ErrorBase hasn't `message` argument that Error has. However, you can provide it in your error class yourself, as well as any other arguments and properties you may need. But be careful with property names. For example, inaccurate overriding of `message` property (which is a getter) can break functionality.

## Usage example

Defining custom error class:

```js
var inherits = require('util').inherits;
var ErrorBase = require('nerr').ErrorBase;

var MyError = function (code) {
	ErrorBase.call(this);
	this.code = code;
};
inherits(MyError, ErrorBase);

MyError.prototype.name = 'MyError';

MyError.prototype.getMessage = function () {
	return 'Error code: ' + this.code;
};
```

Using it:

```js
try {
	throw new MyError(500);
}
catch(err) {
	// prints error name, message and stack trace
	console.log('Stack trace:\n', err.stack);

	console.log();

	// prints error name and message
	console.log('Error:', err.toString());

	console.log();

	console.log('Error name:', err.name);
	console.log('Error message:', err.message);
}
```

## How it works

ErrorBase constructor calls `Error.captureStackTrace()` which provides given object with a `stack` getter, that returns constructed stack trace.

`captureStackTrace(obj, func)` constructs stack trace by concatenating obj.toString() with a stack trace itself (`func` is used to appropriately truncate stack trace, excluding error construction function trace). captureStackTrace() is called at construction time, when it isn't known what will be error's string representation - because it depends on getMessage() that may depend on properties that are not initialized yet. So, captureStackTrace() is provided with StackKeeper instance which has toString() returning empty string. Error's actual string representation will be added later, on call of getStackTrace() or `stack` getter.

## Compatibility

ErrorBase implementation depends on undocumented `Error.captureStackTrace()` function and on how exactly it constructs a stack trace. For time of writing it's fully V8-compatible, but situation may change in future.

It's planned to provide fixes when needed, keeping ErrorBase backwards compatible. Please tell me if something is wrong with it on some specific version of node.js

`require('nerr').compat.ErrorBase` contains implementation that does not depend on any undocumented features and supposed to work correctly on any version of node.js It produces less accurate stack trace with some lines that must not be actually present, but it is still a correct working solution. However, it is not recommended to use unless you need a temporary workaround, waiting for fix in standard ErrorBase.
