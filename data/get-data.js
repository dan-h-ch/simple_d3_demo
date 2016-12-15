var getLocationData = function(appId, jsKey, serverURL, callback, error){

  $("#status-msg").text("Loading data from server...");

  Parse.initialize(appId, jsKey);
  Parse.serverURL = serverURL;

  var DATA = [];
  var skip = 0;
  const limit = 1000;

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