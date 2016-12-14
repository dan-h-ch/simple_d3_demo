// Get location data from db
var appId = "";
var jsKey = "";
var serverURL = "";
getLocationData(appId, jsKey, serverURL, function(rawD){
  console.log("Got " + rawD.length);
  doIt(rawD);
});

function doIt(rawD) {

// define some dimensions for the projection
var width = 960;
var height = 500;

// D3 Projection
var projection = d3.geo.albersUsa()
  .translate([width/2, height/2])  // translate to center of screen
  .scale([1000]);  // scale things down so see entire US
  
// Define path generator
var path = d3.geo.path()  // path generator that will convert GeoJSON to SVG paths
  .projection(projection);  // tell path generator to use albersUsa projection


//Create SVG element and append map to the SVG
var svg = d3.select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);
  
// Bind the data to the SVG and create one path per GeoJSON feature
svg.selectAll("path")
  // stats is from us-states.js - required in as a file on index.html
  .data(states.features)
  .enter()
  .append("path")
  .attr("d", path)
  .style("stroke", "#000")
  .style("stroke-width", "1")
  .style("fill", "lightgray")

// next steps are about organizing data into usable form - first is pop density plot
// if persistent db is available it will probably be better to have BI tables and batch updates
// select only entries with state and city data
var cityStateData = rawD.filter((entry) => {
  return (entry.state && entry.city) ? true : false;
})

// store in object
var cityStateObj = {}

cityStateData.forEach((entry) => {
  var local = '' + entry.city + ',' + entry.state
  if (cityStateObj[local]) {
    cityStateObj[local].pop++
  } else {
    // save long/late based on first entry of that city - not 100% accurate but works for this
    cityStateObj[local] = {pop: 1, location: entry.location}
  }
})

// store in array for plot
var cityStateArr = []

for (var key in cityStateObj) {
  cityStateArr.push( {name: key, pop: cityStateObj[key].pop, location: cityStateObj[key].location})
}

// this was a filter on entry.location data can prob refactor to just use filter with city, state (above)
var filteredData = rawD.filter((entry) => {
  return entry.location ? true : false
})

// out of filteredData, which ones are missing birthday?
var missingData = filteredData.filter((entry) => {
  return entry.birthday ? false : true
})

// prep for age calculation - removing users without d.o.b
var filteredData = filteredData.filter((entry) => {
  return entry.birthday ? true : false
})

// getting todays date
var today = new Date()
// this is a hack - rebuild or bring in a libarary for this
var ageCalc = function(birthdayFromData) {
  return (today - new Date(birthdayFromData))/(1000*60*60*24*365)
}

// add age to user level records
for (var n = 0; n < filteredData.length; n++) {
  var entry = filteredData[n]
  entry.age = ageCalc(entry.birthday.$date)
}

// find uper and lower bonds for age
var ageMax = filteredData.reduce((memo, val) => {
  return val.age >= memo ? val.age : memo;
}, -Infinity)

var ageMin = filteredData.reduce((memo, val) => {
  return val.age <= memo ? val.age : memo;
}, Infinity)

// arbitrarily set it - some bad data
ageMax = 18
ageMax = 40

// Define linear scale for age
var color = d3.scale.linear()
  .domain([ageMin, ageMax])
  .range(["yellow","blue"])
  .clamp(true);

// get some size scaling based on pop
var popMax = cityStateArr.reduce((memo, val) => {
  return val.pop > memo ? val.pop : memo;
}, -Infinity)

var popMin = cityStateArr.reduce((memo, val) => {
  return val.pop <= memo ? val.pop : memo;
}, Infinity)

// define linear scale for popsize
var popSize = d3.scale.linear()
  .domain([popMin, popMax])
  .range([5,30])
  .clamp(true);

svg.selectAll(".pin")
  .data(cityStateArr)
  .enter().append("circle", ".pin")
  .style("stroke", "gray")
  .attr("r", function(d) {
    return popSize(d.pop)
  })
  .attr("fill", function(d) {
    return "slateblue"
    // return color(d.age)
  })
  .style("fill-opacity", 0.3)
  .attr("transform", function(d) {
    var loc = [d.location[0], d.location[1]]
    return "translate(" + projection(loc) + ")"
  })

}