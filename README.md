gardener
========

Point a gardener at couchdb and it will install, update, and run node processes that design-docs and couchapps depend on.

![gardener](http://openclipart.org/people/johnny_automatic/johnny_automatic_a_pixie_waters.svg)

[![Build Status](https://secure.travis-ci.org/garden20/gardener.png)](http://travis-ci.org/garden20/gardener)


Usage
------

    npm install gardener -g
    gardener http://admin:pass@localhost:5984

This tells the gardener to watch all the databases on your local couch. But what does it do?


Simple. It looks for ```node_modules``` on design docs. Like this:

```
  {
    "id": "_design/twitter_things",
    "views" : {
        "map" : "by_date" : "function(doc) { emit(doc.date, null); }"
    }
    "node_modules" : "twitter-loader,worker-generate-thumbnails@0.4.6"
  }

```

In this case, gardener will npm install twitter-loader and worker-generate-thumbnails and run them. Gardener passes them the couch url, and optional username and password. It will look something like this:

```
$ gardener http://localhost:5984
info: [gardener] polling couch for design doc changes.
info: [gardener] installing twitter-loader-1.0.1.tgz start_immediate=true, module_digest=md5-COu0+gC6Cvk+UPOB3yz6iQ==, module_name=twitter-loader-1.0.1.tgz, package_version=1.0.1, local_name=aHR0cDovL2xvY2FsaG9zdDo1OTg0L3Rlc3QvX2Rlc2lnbi9tdWNreW11Y2s=, ddoc_url=http://localhost:5984/test/_design/myapp, db_url=http://localhost:5984/test
npm http GET https://registry.npmjs.org/twitter-loader
npm http 200 https://registry.npmjs.org/twitter-loader/twitter-loader-1.0.1.tgz
npm WARN package.json twitter-loader@1.0.1 No README.md file found!
twitter-loader@1.0.1 installed_packages/node_modules/twitter-loader
info: [gardener] starting package [twitter-loader] in working_dir/aHR0cDovL2xvY2FsaG9zdDo1OTg0L3Rlc3QvX2Rlc2lnbi9tdWNreW11Y2s=
info: [twitter-loader] Twitter loader is dumping tweets into http://localhost:5984/test

```
Yay, twitter loader has been installed, run, and hooked up to the right db.


How-to Node Program
-------------------

Create a directory called 'twitter-loader'. Add `server.js` to it that looks like:

```
// the gardener will set the COUCH_URL variable. Now do what you want!
var db_url = process.env.COUCH_URL || 'http://localhost:5984/test';

// do something and save to couch
load_all_of_twitter(db_url);

```

Add a package.json file. npm publish.

(When publishing try to use the couchdb-worker tag so it is easy for others to find and resuse).


So like, what could I do with it?
-------------------------------

Use some existing workers on npm: [tagged couchdb-worker on npm](https://npmjs.org/browse/keyword/couchdb-worker)

Here are just some ideas, you can extrapolate:

 - use existing workers from [hoodie](https://github.com/hoodiehq) or [null2/jo](https://github.com/null2/couchdb-worker)
 - [Make a queue service](https://github.com/iriscouch/cqs)
 - [RSS feed archiving](https://github.com/maxogden/couchpubtato)
 - [download all the things](https://github.com/maxogden/download-all-the-things)
 - Add a [pixel-tracker](https://github.com/tblobaum/pixel-tracker) and store in couch
 - Add chained map reduce to couchdb with something like [couch-incarnate](https://github.com/afters/couch-incarnate)
 - and much more!




Advanced Usage:
---------------
```
Usage: gardener <url> [OPTIONS]

Available OPTIONS:
--include, -i  Comma seperated db and design docs to include.
--exclude, -e  Comma seperated db and design docs to exclude.
--web, -w	   Turn on a local http server and add turn on the /_garden proxy to it from couch ("true" or "false", "true" by default)
--host, -h	   The host name (or IP address) to bind the http server to. (localhost by default)
--port, -p	   The port to bind the http server to. (integer, 25984 by default)
--upnp	Use upnp to open the port on the firewall, and use the public ip ("true" or "false", "false" by default)
--user	The username given to the node module for connecting to couch
--pass  The password given to the node module for connecting to couch
--time, -t	Polling interval (seconds) to check couch for changes to design docs (integer, 30 by default)
--stdinpass when specified, gardener will read a single line from stdin, which will be used as the password when connecting to couch

```

see [examples](./examples.md) for examples of commandline usage.


Slim
----

To reduce the footprint of gardener dependencies, not all are listed in the dependencies section. To use some features you will have to do an addition npm install.

  - web, you need to ```npm install tako```
  - upnp, you need to ```npm install nat-upnp```
  - testing (or make or npm test) ```npm install mocha```

I am probably doing this wrong. Please let me know a better solution.



About Version Numbers
----------------------

gardener follows [semver-ftw](http://semver-ftw.org/). Dont think 1.0.0 means production ready yet. There were some breaking changes, so had to move up the major version.




