VideoShare
==========

Concrete example of "Javascript Everywhere"

This project aims to show how some exciting technologies can be put together to build web applications using a single development language : JavaScript.
* [HTML5](http://www.html5rocks.com/en/) (video, canvas, drag&drop, web sockets), [AngularJS](http://angularjs.org/), [Twitter Bootstrap](http://twitter.github.com/bootstrap/), [JQuery](http://jquery.com/)
* [Node.js](http://nodejs.org/), [Express](http://expressjs.com/) (REST API)
* [CouchDB](http://couchdb.apache.org/), [MongoDB](http://www.mongodb.org/) (MapReduce)

![Javascript Everywhere](/public/img/overview.png)

VideoShare is a simple web app with basic functions :
* home page showing last videos and with search function
* a page playing a video with real-time feebacks (based on websockets)
* a page for adding new video (using canvas, videos and drag&drop)
* a page showing basic stats (based on a map-reduce)

## Installation

``` bash
     npm install
```

## Run

* Start MongoDB
``` bash
    mongod --dbpath /path/to/my/db
```

* Start NodeJS
``` bash
     node main
```

Open your browser, enter http://localhost:8888.

The application has been tested with :
* Google Chrome v25
* Firefox v19 (restriction with video snapshot : there is a security exception)

## Todo

* CouchDB
* User management


