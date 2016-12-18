$("#status-msg").text("Loading data from server...")

// for US map
// define some dimensions for the projection
var width = 960;
var height = 500;

// set up projection
var projection = d3.geo.albersUsa()
  .translate([width/2, height/2])  // translate to center of screen
  .scale([1000]);  // scale things down so see entire US
  
// Define path generator
var path = d3.geo.path()  // path generator that will convert GeoJSON to SVG paths
  .projection(projection);  // tell path generator to use albersUsa projection

//Create SVG element and append map to the SVG
var svg = d3.select("#geo")
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

fetch('/data')
  .then(function(res) {
    return res.json()
  })
  .then(function(res) {
    drawData(res)
  })

var methinkOrdPal_7 = ['#6563A4', '#FCAB53', '#50D2C2', '#8C88FF', '#FF3366', '#BA77FF', '#B5BABF']

function drawData(rawData) {

// Remove loading text
$("#status-msg").html("");

// next steps are about organizing data into usable form - first is pop density plot
// if persistent db is available it will probably be better to have BI tables and batch updates
// select only entries with state and city data
var filteredData = rawData.filter((entry) => {
  return (
    entry.state 
    && entry.city 
    && (entry.gender !== "" || entry.gender !== undefined)
    && entry.birthday
  ) ? true : false;
})

// total data size
var totalEntries = filteredData.length

// store in objects
var cityStateObj = {}
var ageBinObj = {}


// arrays since d3 needs arrays
var cityStateArr = [];
var ageBinArr = [];

// getting todays date
var today = new Date();

// this is a hack - rebuild or bring in a libarary for this
var ageCalc = function(birthdayFromData) {
  return (today - new Date(birthdayFromData))/(1000*60*60*24*365);
}

// adding some extra values for plot
filteredData.forEach((entry) => {
  var local = '' + entry.city + ',' + entry.state
  if (cityStateObj[local]) {
    cityStateObj[local].pop++
  } else {
    // save long/late based on first entry of that city - not 100% accurate but works for this
    cityStateObj[local] = {pop: 1, location: entry.location}
  }
  // age calc and putting into bins
  entry.age = ageCalc(entry.birthday.iso)
  if (entry.age < 18) {
    entry.ageBin = 'Less than 18'
     entry.ageBinOrder = 1
  } else if (entry.age >=18 && entry.age < 24) {
    entry.ageBin = '18 to 24'
    entry.ageBinOrder = 2
  } else if (entry.age >=24 && entry.age < 35) {
    entry.ageBin = '24 to 35'
    entry.ageBinOrder = 3
  } else if (entry.age >=35 && entry.age < 50) {
    entry.ageBin = '35 to 50'
    entry.ageBinOrder = 4
  } else if (entry.age >=50) {
    entry.ageBin = 'Greater than 50'
    entry.ageBinOrder = 5
  } 
  if (ageBinObj[entry.ageBin]) {
    ageBinObj[entry.ageBin].count++
  } else {
    ageBinObj[entry.ageBin] = {count: 1, ageBin: entry.ageBin, order: entry.ageBinOrder}
  }
})

// populate age array for plot
for (var key in ageBinObj) {
  ageBinObj[key].percentage = Math.round((ageBinObj[key].count/totalEntries)*10000)/100
  ageBinArr.push(ageBinObj[key])
}

// populate locaiton array for plot
for (var key in cityStateObj) {
  cityStateArr.push( {name: key, pop: cityStateObj[key].pop, location: cityStateObj[key].location})
}

var drawCityState = function(data) {

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
    .data(data)
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
}(cityStateArr)


// creating new something
var width2 = 960;
var height2 = 500;

// lets see what the genders come up
var genderObj = {}

// take raw data and create a count by gender
rawData.forEach((entry) => {
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


  var drawPie = function(formattedData) {

    var width = 960;
    var height = 500;
    var radius = 200;

    var pieColor = d3.scale.ordinal()
      .range(methinkOrdPal_7);

    var svg = d3.select("body")
      .append('svg')
      .attr("width", width)
      .attr("height", height)
      .append('g')
      .attr('transform', 'translate(' + (width/2) + ',' + (height/2) + ')')

    svg.append("g")
      .attr("class", "slices");
    svg.append("g")
      .attr("class", "labels");
    svg.append("g")
      .attr("class", "lines");

    var arc = d3.svg.arc()
      .outerRadius(radius*0.8)
      .innerRadius(radius*0.2);

    var labelArc = d3.svg.arc()
      .outerRadius(radius*0.9)
      .innerRadius(radius*0.9);

    // converts data to data that can be used to make a pie chart
    var pie = d3.layout.pie()
      .value(function(d) {return d.count})
      .sort(function(a, b) {return a.order - b.order})

    console.log('formattedData', formattedData)

    // create slices
    var slice = svg.select('.slices').selectAll('path')
      .data(pie(formattedData))
      .enter()
      .append('path')
      .attr('d', arc)
      .style("stroke", "silver")
      .style("stroke-width", "1")
      .attr('fill', function(d, i) {
        return pieColor(d.data.ageBin)
      })

    var text = svg.select(".labels").selectAll("text")
      .data(pie(formattedData), key)
      .enter()
      .append("text")
      .attr("dy", ".35em")
      .attr("transform", function(d) {
        var c = arc.centroid(d);
        console.log(d.data, c)
        var xVal = ((d.endAngle + d.startAngle)/2 > Math.PI) ? -radius : radius;
        var x = c[0];
        var y = c[1];
        // pythagorean theorem for hypotenuse
        var h = Math.sqrt(x*x + y*y);
        return "translate(" + /*(x/h * radius*0.9)*/ xVal +  ',' + (y/h * radius*0.9) +  ")"; })
      .text(function(d) {return `${d.data.ageBin} - ${d.data.percentage}%`;})
      .attr("text-anchor", function(d) {
        // are we past the center?
        return (d.endAngle + d.startAngle)/2 > Math.PI ? "end" : "start";
      })
    
  }(ageBinArr)


}
