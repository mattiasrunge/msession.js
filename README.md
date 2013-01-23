# msession.js

A simple http session module to use with node.js. It provides a clean interface for keeping track of sessions by cookie ids and store persistent data for a session.


## Usage

    $ var SessionManager = require('msession.js').Manager;
    $ var sessionManager = new SessionManager();
    $
    $ function httpRequestHandler(request, response)
    $ {
    $   sessionManager.start(request, response, function(error, session)
    $   {
    $     // Do stuff
    $   });
    $ });


