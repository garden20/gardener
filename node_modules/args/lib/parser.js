"use strict";
var errors = require('./errors');


var Parser = function (opt_argv, opt_posOptions) {
	this.argv = opt_argv || process.argv;

	var posOptions = opt_posOptions || {};
	var maxEndPos = this.argv.length - 1;
	this.pos = (posOptions.start == null ? 2 : posOptions.start);
	this.endPos = (posOptions.end == null ? maxEndPos : Math.min(posOptions.end, maxEndPos));
	this.subPos = (posOptions.sub == null ? 0 : posOptions.sub);

	this.result = {};
	this.positional = [];
};

Parser.prototype.clear = function () {
	this.result = {};
	this.positional = [];
};

Parser.prototype.parse = function (options, opt_parseOptions) {
	var parseOptions = opt_parseOptions || {};
	parseOptions.onUnknown = parseOptions.onUnknown || 'error';
	parseOptions.onPositional = parseOptions.onPositional || 'error';
	parseOptions.applyOptions = ('applyOptions' in parseOptions ? !!parseOptions.applyOptions : true);

	var needStop = false;
	while (!needStop && this.hasMore()) {
		var optionInfo = this.nextOption(options);
		if (optionInfo == null) {
			switch (parseOptions.onPositional) {
				case 'process':
					var arg = this.getCurrent();
					this.skip();
					this.processPositional(arg);
					break;
				case 'error':
					throw new errors.UnexpectedPositional(this.getCurrent());
				case 'skip':
					break;
				case 'stop':
					needStop = true;
					break;
			}
		}
		else {
			if (optionInfo.option == null) {
				switch (parseOptions.onUnknown) {
					case 'process':
						this.processOption(optionInfo);
						break;
					case 'error':
						throw new errors.UnknownArg(optionInfo.name, optionInfo.src);
					case 'skip':
						this.skip();
						break;
					case 'stop':
						needStop = true;
						break;
				}
			}
			else {
				this.processOption(optionInfo);
			}
		}
	}

	if (parseOptions.applyOptions) {
		options.applyToResult(this.result);
	}

	return this.result;
};

Parser.prototype.parseToPositional = function (options, parseOptions) {
	parseOptions = parseOptions || {};
	parseOptions.onPositional = 'stop';
	this.parse(options, parseOptions);
	return this.result;
};

Parser.prototype.parseOptions = function (options, parseOptions) {
	this.parse(options, parseOptions);
	return this.result;
};

Parser.prototype.parseOptionsFirst = function (options, parseOptions) {
	this.parseToPositional(options, parseOptions);
	this.parseAsPositional();
	return this.result;
};

Parser.prototype.parseAsPositional = function () {
	var rest = this.getRest();
	for (var i = 0; i < rest.length; i++) {
		this.processPositional(rest[i]);
	}
	return this.positional;
};

Parser.prototype.processPositional = function (arg) {
	this.positional.push(arg);
};

Parser.prototype.processOption = function (optionInfo) {
	var option = optionInfo.option;
	var value = optionInfo.value;
	if (option == null) {
		this.result[optionInfo.name] = value;
	}
	else {
		if (option.isList) {
			var l = this.result[option.key];
			if (l == null) {
				l = [value];
				this.result[option.key] = l;
			}
			else {
				l.push(value);
			}
		}
		else {
			this.result[option.key] = value;
		}
	}
};

Parser.prototype.applyOptions = function (options) {
	options.applyToResult(this.result);
	return this.result;
};

Parser.prototype.getRest = function () {
	return this.argv.slice(this.pos);
};

Parser.prototype.hasMore = function () {
	return this.pos <= this.endPos;
};

Parser.prototype.hasMoreSub = function () {
	var src = this.getCurrent();
	return this.subPos + 1 < src.length;
};

Parser.prototype.getCurrent = function () {
	return this.argv[this.pos];
};

Parser.prototype.skip = function () {
	if (this.isShort(this.getCurrent())) {
		this.subPos++;
		if (!this.hasMoreSub()) {
			this.skipFull();
		}
	}
	else {
		this.skipFull();
	}
};

Parser.prototype.skipFull = function () {
	this.subPos = 0;
	this.pos++;
};

Parser.prototype.getShort = function (src) {
	return src[this.subPos + 1];
};

Parser.prototype.getFull = function (src) {
	var name = src.substr(2);
	var value;
	var gotValue = false;
	var pos = name.indexOf('=');
	if (pos != -1) {
		gotValue = true;
		var tmp = name;
		name = tmp.substr(0, pos);
		value = tmp.substr(pos + 1);
	}

	return {
		name: name,
		value: value
	};
};

Parser.prototype.isOption = function (src) {
	return src[0] == '-';
};

Parser.prototype.isShort = function (src) {
	return this.isOption(src) && src.length > 1 && src[1] != '-';
};

Parser.prototype.nextRaw = function () {
	var result = this.getCurrent();
	this.skipFull();
	return result;
};

Parser.prototype.nextOption = function (options) {
	var src = this.getCurrent();
	if (!this.isOption(src)) {
		return null;
	}
	var name, value, gotValue = false;
	var isShort = this.isShort(src);
	if (isShort) {
		name = this.getShort(src);
	}
	else {
		var nameAndValue = this.getFull(src);
		name = nameAndValue.name;
		value = nameAndValue.value;
	}

	var result = {
		name: name,
		isShort: isShort,
		src: src
	};

	var option = options.getOption(name, isShort, src);
	if (option == null) {
		result.value = value;
	}
	else {
		result.option = option;

		if (value && !option.allowsValue()) {
			throw new errors.UnexpectedValue(option, src);
		}

		this.skip();

		if (value) {
			result.value = option.parseValue(value, src);
		}
		else if (option.allowsValue()) {
			result.value = this.nextValue(option, src);
		}
	}

	return result;
};

Parser.prototype.nextValue = function (option, src) {
	var result;
	if (option.allowsValue()) {
		// need standalone arg
		if (this.subPos === 0 && this.hasMore()) {
			var value = this.getCurrent();
			// do not consume value if is not valid and option is not required
			if (!option.requiresValue() && !option.isValidValue(value)) {
				result = option.getNoValue();
			}
			else {
				result = option.parseValue(value, src);
				this.skip();
			}
		}
		else {
			if (option.requiresValue()) {
				throw new errors.ValueRequired(option, src);
			}
			else {
				result = option.getNoValue();
			}
		}
	}
	return result;
};

Parser.parser = function (opt_argv, opt_posOptions) {
	return new Parser(opt_argv, opt_posOptions);
};

Parser.parse = function (options, parseOptions) {
	return Parser.parser().parse(options, parseOptions);
};

Parser.parseToPositional = function (options, parseOptions) {
	return Parser.parser().parseToPositional(options, parseOptions);
};

Parser.parseOptions = function (options, parseOptions) {
	return Parser.parser().parseOptions(options, parseOptions);
};

Parser.parseOptionsFirst = function (options, parseOptions) {
	return Parser.parser().parseOptionsFirst(options, parseOptions);
};

Parser.parseAsPositional = function () {
	return Parser.parser().parseAsPositional();
};


module.exports = Parser;
