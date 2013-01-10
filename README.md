gardener
========

A node process manager for couchapps that have npm modules bundled with them. 


huh?
----

Couchapps are cool, but sometimes they are a bit limited in what they can do. So what if you could also do stuff in a node process?
Gardener watches your couch and if it notices couchapps with npm modules bundled with them, it will install those modules and run them forever. 

The launched node process will be given the details of the couch including the url, and optional username and password.


Usage
------

    npm install gardener
    ./bin/gardener watch http://localhost:5984


Couchapp Format
----------------

To work correctly with the gardener, your couchapp needs the following:

 1. An attachment that is a valid npm module. eg _design/myapp/myapp-1.0.1.tgz
 2. A property named `node_module` with a value of 'myapp-1.0.1.tgz'.

To create an npm module by hand, do `npm pack your_node_directory'.

If you are using http://kan.so for developing couchapps, you can use the [kanso-gardener module](https://github.com/kanso/kanso-gardener)

Sample Node Program
--------------------

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