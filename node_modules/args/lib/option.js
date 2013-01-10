"use strict";
var errors = require('./errors');


var Option = function () {
	this.name = null;
	this.shortName = null;
	this.key = null;
	this.type = null;
	this.isList = false;
	this.enumItems = null;
	this.enumHelp = null;
	this.required = false;
	this.defaultValue = undefined;
	this.help = null;
};

Option.prototype.getHelp = function () {
	var result = [];
	if (this.name) {
		result.push('--');
		result.push(this.name);
	}
	if (this.shortName) {
		if (this.name) {
			result.push(', ');
		}
		result.push('-');
		result.push(this.shortName);
	}
	result.push('\t');
	if (this.help) {
		result.push(this.help);
	}
	if (this.required) {
		result.push(', required');
	}
	var typeInfo = this.getTypeInfo();
	if (typeInfo) {
		if (this.help) {
			result.push(' (');
		}
		result.push(typeInfo);
		if (this.defaultValue !== undefined) {
			result.push(', ');
			result.push(this.getDefaultValueStr());
			result.push(' by default');
		}
		if (this.help) {
			result.push(')');
		}
	}
	else if (this.defaultValue !== undefined) {
		if (this.help) {
			result.push(' (');
		}
		result.push(this.getDefaultValueStr());
		result.push(' by default');
		if (this.help) {
			result.push(')');
		}
	}

	return result.join('');
};

Option.prototype.getTypeInfo = function () {
	switch (this.type) {
		case 'enum':
			return 'one of: ' + this.enumItems.join(', ');
		case 'bool':
			return '"true" or "false"';
		case 'int':
			return 'integer';
		case 'float':
			return 'decimal';
		case 'date':
			return 'date';
		case 'datetime':
			return 'datetime';
	}
	return '';
};

Option.prototype.parse = function (optionInfo) {
	this.name = optionInfo.name;
	this.shortName = optionInfo.shortName;
	this.key = optionInfo.key;
	this.type = optionInfo.type;
	this.isList = optionInfo.isList === undefined ? this.isList : !!optionInfo.isList;
	this.enumItems = optionInfo.enumItems;
	this.enumHelp = optionInfo.enumHelp;
	this.required = !!optionInfo.required;
	this.defaultValue = (optionInfo.type == 'bool' ? !!optionInfo.defaultValue : optionInfo.defaultValue);

	this.help = optionInfo.help;

	if (this.key == null) {
		this.key = this.name;
	}

	if (this.key == null) {
		throw new Error('Option must have "name" or "key" property set');
	}
	if (this.name == null && this.shortName == null) {
		throw new Error('Option must have "name" or "shortName" property set');
	}
};

Option.prototype.getName = function () {
	return this.name || this.shortName;
};

Option.prototype.matches = function (name, isShort) {
	var result = false;
	if (name) {
		result = isShort ? this.shortName == name : this.name == name;
	}
	return result;
};

Option.prototype.allowsValue = function () {
	// all standard types allow value
	return true;
};

Option.prototype.requiresValue = function () {
	return !this.isBool();
};

Option.prototype.isBool = function () {
	return this.type == 'bool';
};

Option.prototype.getNoValue = function () {
	var result;

	if (this.isBool()) {
		result = true;
	}

	return result;
};

Option.prototype.getCheckRe = function () {
	var checkRe = {
		'bool': /^true|false$/,
		'int': /^-?\d+$/,
		'float': /^-?\d+(\.\d+)?$/ // TODO alow exponential form
		// TODO checks for 'date' & 'datetime'
	};
	return checkRe[this.type];
};

Option.prototype.isValidValue = function (value) {
	var result;

	if (this.type == 'enum') {
		result = (this.enumItems.indexOf(value) != -1);
	}
	else {
		var re = this.getCheckRe();
		result = (re == null || re.test(value));
	}

	return result;
};

Option.prototype.ensureIsValid = function (value, src) {
	if (!this.isValidValue(value)) {
		throw new errors.BadValue(this, value, src);
	}
};

Option.prototype.parseValue = function (value, src) {
	this.ensureIsValid(value, src);

	switch (this.type) {
		case 'bool':
			return value == 'true';
		case 'int':
			return parseInt(value, 10);
		case 'float':
			return parseFloat(value);
		case 'date':
		case 'datetime':
			return new Date(value);
	}

	return value;
};

Option.prototype.getDefaultValueStr = function () {
	if (this.defaultValue === undefined) {
		return '';
	}

	var value = this.defaultValue;
	switch (this.type) {
		case 'bool':
		case 'date':
		case 'datetime':
			value = ['"', value, '"'].join('');
			break;
	}

	return ''+value;
};

Option.parse = function (option) {
	var instance = new Option();
	instance.parse(option);
	return instance;
};


module.exports = Option;
