gardener
========

A node process manager for couchapps that have npm modules bundled with them. 


huh?
----

Couchapps are cool, but sometimes they are a bit limited in what they can do. So what if you could also do stuff in a node process?
Gardener watches your couch and if it notices couchapps with npm modules bundled with them, it will install those modules and run them forever. 

The launched node process will be given the details of the couch including the url, and optional username and password.


Useage
------

    npm install gardener
    ./bin/gardener watch http://me.garden20.com

