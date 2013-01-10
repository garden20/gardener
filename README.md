gardener
========

Grow your couchapps by using nodejs. Gardener will run node modules attached to your couchapps. 


huh?
----

Couchapps are cool, but sometimes they are a bit limited in what they can do. So power your couchapp up with a node process!
Gardener watches a couchdb and notices design docs with npm modules attached. It will install the npm module and run them forever. 

The launched node process will be given the details of the couch including the url, and optional username and password.


So like, what could I do with it?
-------------------------------

Here are just some ideas you could distribute directly with your couchapp, you can extrapolate:

 - [Make a queue service](https://github.com/iriscouch/cqs)
 - [RSS feed archiving](https://github.com/maxogden/couchpubtato)
 - [download all the things](https://github.com/maxogden/download-all-the-things)
 - Add a [pixel-tracker](https://github.com/tblobaum/pixel-tracker) and store in couch
 - Add chained map reduce to couchdb with something like [couch-incarnate](https://github.com/afters/couch-incarnate)
 - and much more!


Usage
------

    npm install gardener
    ./bin/gardener watch http://localhost:5984



Sample Node Program
--------------------

Create a directory called 'myapp'. Add `server.js` to it that looks like:

```
// the gardener will set the COUCH_URL variable. Now do what you want!
var db_url = process.env.COUCH_URL || 'http://localhost:5984/test';

// below is OPTIONAL. It shows a how to proxy from couch to us.

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(38293, '127.0.0.1');

// Tell the gardener the port number to route to
if (process.send) process.send({ port: 38293 })
// now http://locahost:5984/_gardener/test/_design/myapp will route to us!!!

```

Add a package.json file. Done


Add to the Couchapp 
-------------------

To work correctly with the gardener, your couchapp needs the following:

 1. An attachment that is a valid npm module. eg _design/myapp/myapp-1.0.1.tgz
    - To create an npm module by hand, do `npm pack your_node_directory'. Then attach this to your couchapp. 
    - If you are using http://kan.so for developing couchapps, you can use the [kanso-gardener module](https://github.com/kanso/kanso-gardener)

 2. A property named `node_module` with the name of the attachment. eg 'myapp-1.0.1.tgz'.


push it to your db, eg `couchapp push http://localhost:5984/test`

Running gardener will produce the following:


```
gardener$ ./bin/gardener watch http://localhost:5984
info: [gardener] http server started on port: 25984
info: [gardener] polling couch for design doc changes.
info: [gardener] installing myapp-1.0.1.tgz start_immediate=true, module_digest=md5-COu0+gC6Cvk+UPOB3yz6iQ==, module_name=myapp-1.0.1.tgz, package_version=1.0.1, local_name=aHR0cDovL2xvY2FsaG9zdDo1OTg0L3Rlc3QvX2Rlc2lnbi9tdWNreW11Y2s=, ddoc_url=http://localhost:5984/test/_design/myapp, db_url=http://localhost:5984/test
npm http GET http://localhost:5984/test/_design/myapp/myapp-1.0.1.tgz
npm http 200 http://localhost:5984/test/_design/myapp/myapp-1.0.1.tgz
npm WARN package.json myapp@1.0.1 No README.md file found!
myapp@1.0.1 installed_packages/node_modules/myapp
info: [gardener] starting package [myapp] in working_dir/aHR0cDovL2xvY2FsaG9zdDo1OTg0L3Rlc3QvX2Rlc2lnbi9tdWNreW11Y2s=
info: [gardener] process [myapp] has bound to port 38293
info: [gardener] adding route /_gardener/test/_design/myapp -> http://localhost:38293

```




Advanced Usage:
---------------
```
Usage: gardener COMMAND [ARGS]

Available COMMANDs:
  install   [ddoc_url ] 
  watch     [couch_url] [OPTIONS]

Available OPTIONS:
--web, -w	Turn on a local http server and add turn on the /_garden proxy to it from couch ("true" or "false", "true" by default)
--host, -h	The host name (or IP address) to bind the http server to. (localhost by default)
--port, -p	The port to bind the http server to. (integer, 25984 by default)
--upnp	Use upnp to open the port on the firewall, and use the public ip ("true" or "false", "false" by default)
--user	The username given to the node module for connecting to couch
--pass	The password given to the node module for connecting to couch
--time, -t	Polling interval (seconds) to check couch for changes to design docs (integer, 30 by default)

```