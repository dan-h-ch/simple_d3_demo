var getLocationData = function(appId, jsKey, serverURL, callback){

  console.log("got getLocationData request");

  Parse.initialize(appId, jsKey);
  Parse.serverURL = serverURL;

  var DATA = [];
  var skip = 0;
  const limit = 1000;

  var process = function(skip) {
    var query = new Parse.Query("_User");
    if (skip) {query.skip(skip);}
    query.limit(limit);
    return query.find().then(function(results){

      console.log("found " + results.length);

      DATA = DATA.concat(results);
      skip += limit;
      if (results.length == limit) {
        process(skip);
      } else {
        callback(DATA);
      }
    }, function(error){
      console.log(error);
    })
  }

  process(skip);
}