REPORTER = dot

test :
	./node_modules/.bin/mocha tests/test.js;


.PHONY: test