var config = require('./config')
var Parse = require('parse/node')

module.exports = function(app, express){

  // Parse query for rawdata - abstract out later
  var getLocationData = function(appId, jsKey, serverURL, callback, error){

    // $("#status-msg").text("Loading data from server...");

    Parse.initialize(appId, jsKey);
    Parse.serverURL = serverURL;

    var DATA = [];
    var skip = 0;
    const limit = 1000;

    // need to clean up this query to not send everything over
    var process = function(skip) {
      var query = new Parse.Query("_User");
      query.exists("location");
      if (skip) {query.skip(skip);}
      query.limit(limit);
      return query.find().then(function(results){
        DATA = DATA.concat(results);
        skip += limit;
        if (results.length == limit) {
          process(skip);
        } else {
          callback(JSON.parse(JSON.stringify(DATA)));
        }
      }, function(err){
        error(err.code + ", " + err.message);
      })
    }

    process(skip);
  }

  app.get('/data', function(req, res) {
    console.log('trying to get something')

    getLocationData(config.appId, config.jsKey, config.serverURL, function(rawD){
      res.status(200).send(JSON.stringify(rawD));
    }, function(error){
      console.log(error);
    });

  })



}