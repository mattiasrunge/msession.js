
var fs = require('fs');
var path = require('path');

function Session(options, document)
{
  var self = this;

  if (!document)
  {
    document = {};

    document._id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
    {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  self.document = document;

  self.getId = function()
  {
    if (self.document)
    {
      return self.document._id;
    }

    return null;
  };

  self.save = function(callback)
  {
    var filename = options.pathPrefix + self.getId();
console.log(filename);
    fs.writeFile(filename, JSON.stringify(self.document), function(error)
    {
      if (error)
      {
        callback(error);
        return;
      }

      callback(null);
    });
  };
};

function SessionManager(options)
{
  var self = this;

  self.sessions = {};

  options = options || {};

  options.pathPrefix = options.pathPrefix || "/tmp/msession_";
  options.name = options.name || "msession";
  options.expire = options.expire || 3600 * 24 * 7 * 2;

  self.options = options;


  self._parseCookieString = function(cookieString)
  {
    var cookies = {};

    if (cookieString)
    {
      cookieString.split(';').forEach(function(cookie)
      {
        var parts = cookie.split('=');
        cookies[parts[0].trim()] = (parts[1] || '').trim();
      });
    }

    return cookies;
  };

  self._findById = function(id, callback)
  {
    /* Check if already in memory */
    if (self.sessions[id])
    {
      callback(null, self.sessions[id]);
      return;
    }


    /* Check if file exists on disk */
    var filename = self.options.pathPrefix + id;

    fs.exists(filename, function(exists)
    {
      if (!exists)
      {
        callback("No session with id " + id + " found!");
        return;
      }

      fs.readFile(filename, function(error, data)
      {
        if (error)
        {
          callback(error);
          return;
        }

        self.sessions[id] = new Session(self.options, JSON.parse(data));
        callback(null, self.sessions[id]);
      });
    });
  };

  self.start = function(request, response, callback)
  {
    var expireTimestamp = (new Date()).getTime() + (self.options.expire * 1000);
    var expireString = (new Date(expireTimestamp)).toUTCString();

    self.findByCookieString(request.headers.cookie, function(error, session)
    {
      if (error)
      {
        callback(error);
        return;
      }

      /* Create a new session if one was not found */
      if (session === false)
      {
        session = new Session(self.options);

        console.info("Started new session with id " + session.getId());

        session.save(function(error)
        {
          if (error)
          {
            callback(error);
            return;
          }

          self.sessions[session.getId()] = session;

          response.setHeader("Set-Cookie", self.options.name + "=" + session.getId() + "; path=/; expires=" + expireString);
          callback(null, session);
        });
      }
      else
      {
        response.setHeader("Set-Cookie", self.options.name + "=" + session.getId() + "; path=/; expires=" + expireString);
        callback(null, session);
      }
    });
  };

  self.findByCookieString = function(cookieString, callback)
  {
    var cookies = self._parseCookieString(cookieString);

    if (!cookies[self.options.name])
    {
      callback(null, false, cookies);
      return;
    }

    self._findById(cookies[self.options.name], function(error, session)
    {
      if (error)
      {
        console.log(error);
        callback(null, false, cookies);
        return;
      }

      callback(null, session, cookies);
    });
  };
};

exports.Manager = SessionManager;


