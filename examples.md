basic format

    gardener url


where url is the top level in the couchdb url space to look.

Examples:



1. Scan all design docs inside of all databases

    > gardener http://localhost:5984

2. Scan all design docs inside of the test database

    > gardener http://localhost:5984/test

3. Watch only one design doc named awesome in the test database

    > gardener http://localhost:5984/test/_design/awesome

5. Exclude Filter. Scan all databases, except work, quarantine, and the design doc feeble in the inprogress db.

    > gardener http://localhost:5984 --exclude=work,quarantine,inprogress/_design/feeble

6. Include Filter. Only poll specified databases, core, awesome and cool, and the design doc hot in the maybe db.

    > gardener http://localhost:5984 --include=core,awesome,cool,maybe/_design/hot

7. Mix and match 1, dbs. Results in core and cool dbs being scanned.

    > gardener http://localhost:5984 --include=core,awesome,cool --exclude=test2,work,awesome

8. Mix and match 2. dbs and ddocs. Exclude always wins. In this case gardener has nothing to watch!

    > gardener http://localhost:5984 --include=code/_design/neat --exclude=code

9. Mix and match 3. dbs and ddocs. Exclude the sucky design doc form the code db

    > gardener http://localhost:5984 --include=code --exclude=code/_design/sucky


Dashboard Style
---------------

Adding the --dashboard-db tell gardener will watch the specified db in a changes style feed. It is assumed the documents in this database are install docs that are generated from [garden app installer](https://github.com/garden20/garden-core). The advantage of this appoach is that the installation progress can be given to a webui because progress is updated on the install doc.

1. Watch only the dashboard db using, following the changes feed. First style.

    > gardener http://localhost:5984/ --dashboard=dashboard --include=dashboard

2. Watch only the dashboard db using, following the changes feed. Second style.

    > gardener http://localhost:5984/dashboard --dashboard=dashboard

3. Scan all design docs inside of all databases, but for the dashboard db follow the changes feed.

    > gardener http://localhost:5984/ --dashboard=dashboard


Errors
--------

The following combinations are errors, and gardener will fail to start rathere than leaving indeterminate results.

    > gardener http://localhost:5984/mydb --exclude=otherdb
    > gardener http://localhost:5984/mydb --include=otherdb
    > gardener http://localhost:5984/mydb/_design/hot --exclude=otherdb
    > gardener http://localhost:5984/mydb/_design/hot --include=otherdb








