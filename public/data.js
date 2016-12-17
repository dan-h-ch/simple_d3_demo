// Get location data from db
// var appId = "";
// var jsKey = "";
// var serverURL = "";
getLocationData(appId, jsKey, serverURL, function(rawD){
  drawMap(rawD);
}, function(error){
  $("#status-msg").text(error);
});

function drawMap(rawD) {

// Remove loading text
$("#status-msg").html("");

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
  .style("stroke", "silver")
  .style("stroke-width", "1")
  .style("fill", "white")

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
  return (today - birthdayFromData)/(1000*60*60*24*365)
}

// add age to user level records
for (var n = 0; n < filteredData.length; n++) {
  var entry = filteredData[n]
  entry.age = ageCalc(entry.birthday)
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
  .range([4,15])
  .clamp(true);


svg.selectAll(".pin")
  .data(cityStateArr)
  .enter().append("circle", ".pin")
  .style("stroke", "gray")
  .attr("r", function(d) {
    return popSize(d.pop)
  })
  .attr("fill", function(d) {
    return "#8C88FF"
    // return color(d.age)
  })
  .style("fill-opacity", 0.3)
  .attr("transform", function(d) {
    var loc = [d.location.longitude, d.location.latitude]
    return "translate(" + projection(loc) + ")"
  })

// creating new something
var width2 = 960;
var height2 = 500;

// lets see what the genders come up
var genderObj = {}

// take raw data and create a count by gender
rawD.forEach((entry) => {
  if (genderObj[entry.gender]) {
    genderObj[entry.gender]++
  } else {
    genderObj[entry.gender] = 1
  }
})

// create an array to fit data into var pointsWanted points
// only focusing on male/female/lgbt for infographic
var totalPoints = genderObj.Male + genderObj.Female + genderObj.LGBT
// not this impact genderArr size and thus time to prep data
// as this number gets larger javascript decimal math causes problem
// don't go over 4000
var pointsWanted = 1000 

// create array that will be used for d3 plotting
var genderArr = []

var newGenderArr = []

// fill the array
for (var key in genderObj) {
  if (key === "Male" || key === "Female" || key === "LGBT") {
    var count = Math.round(genderObj[key]/totalPoints*pointsWanted)
    console.log(key, genderObj[key]/totalPoints*100)
    for (var n = 0; n < count; n++) {
      genderArr.push({gender: key})
    }
  }
  if (key === 'Male' || key ==='Female') {
    newGenderArr.push({gender: key, count: genderObj[key]})
  }
}

console.log(newGenderArr)

// assigned an order so d3 can order the data - this is not actually needed since we populate one genderArr one gender at a time
genderArr.forEach((entry) => {
  if (entry.gender === 'Female') {
    entry.genderOrder = 1
  } else if (entry.gender === 'Male') {
    entry.genderOrder = 2
  } else if (entry.gender === 'LGBT') {
    entry.genderOrder = 3
  } else {
    entry.genderOrder = 4
  }
})

// gender stuff
var svg2 = d3.select("body")
  .append("svg")
  .attr("width", width2)
  .attr("height", height2);

var genderMax = Math.max(newGenderArr[0].count, newGenderArr[1].count)
var genderMin = Math.min(newGenderArr[0].count, newGenderArr[1].count)

var genderSize = d3.scale.linear()
  .domain([genderMin, genderMax])
  .range([100,150])
  .clamp(true);

var svg3 = d3.select("body")
  .append("svg")
  .attr("width", width2)
  .attr("height", height2);

var genderSize3 = d3.scale.linear()
  .domain([genderMin, genderMax])
  .range([200,350])
  .clamp(true);

svg3.selectAll(".gender_image")
  .data(newGenderArr)
  .enter()
  .append("svg:image", ".gender_image")
  .attr("xlink:href", function(d) {return d.gender === "Male" ? "http://www.a-listinternational.com/wp-content/uploads/2016/06/brad-pitt-doesn-t-really-look-much-like-brad-pitt-in-these-photos-727400.jpg" : "https://s-media-cache-ak0.pinimg.com/736x/8f/3b/9c/8f3b9cda3783cf34a8354d7122e4a91c.jpg"})
  .attr("width", function(d) {return genderSize3(d.count)})
  .attr("height", function(d) {return genderSize3(d.count)})
  .attr("y", function(d) {return height/2 - genderSize3(d.count)/2})
  .attr("x", function(d, i) {return (i+1)*width/3 - genderSize3(d.count)/2})
  .attr("fill", function(d) {
    if (d.gender === 'Female') {
      return "pink"
    } else if (d.gender === 'Male') {
      return "lightblue"
    } else if (d.gender === 'LGBT') {
      return "green"
    } else {
      return "gray"
    }
  })

svg2.selectAll(".gender_dot")
  .data(newGenderArr)
  .enter()
  .append("circle", ".gender_dot")
  .attr("r", function(d) {return genderSize(d.count)})
  .attr("cy", height/2)
  .attr("cx", function(d, i) {return (i+1)*width/3})
  .attr("fill", function(d) {
    if (d.gender === 'Female') {
      return "pink"
    } else if (d.gender === 'Male') {
      return "lightblue"
    } else if (d.gender === 'LGBT') {
      return "green"
    } else {
      return "gray"
    }
  })

// svg2.selectAll(".gender_dot")
//   .data(genderArr)
//   .enter().append("circle", ".gender_dot")
//   .sort(function(a,b) {
//     return a.genderOrder - b.genderOrder
//   })
//   .attr("r", 3)
//   .attr("cy", function(d, i) {return 4 + Math.floor(i/100) * 8})
//   .attr("cx", function(d, i) {return 4 + ((i % 100) * 8)})
//   .attr("fill", function(d) {
//     if (d.gender === 'Female') {
//       return "pink"
//     } else if (d.gender === 'Male') {
//       return "lightblue"
//     } else if (d.gender === 'LGBT') {
//       return "green"
//     } else {
//       return "gray"
//     }
//   })

var width4 = 360;
var height4 = 360;
var radius = Math.min(width4, height4) /2

var pieColor = d3.scale.ordinal()
  .range(["pink", "lightblue"]);

var svg4 = d3.select("body")
  .append('svg')
  .attr("width", width4)
  .attr("height", height4)
  .append('g')
  .attr('transform', 'translate(' + (width4/2) + ',' + (height4/2) + ')')

var arc = d3.svg.arc()
  .outerRadius(radius - 10)
  .innerRadius(0);

var labelArc = d3.svg.arc()
  .outerRadius(radius - 40)
  .innerRadius(radius - 40);

// converts data to data that can be used to make a pie chart
var pie = d3.layout.pie()
  .value(function(d) {return d.count})
  .sort(null)

console.log('newGenderArr', newGenderArr)

console.log(pie(newGenderArr))

var path = svg4.selectAll('path')
  .data(pie(newGenderArr))
  .enter()
  .append('path')
  .attr('d', arc)
  .style("stroke", "silver")
  .style("stroke-width", "3")
  .attr('fill', function(d, i) {
    return pieColor(d.data.gender)
  })


}
