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
var usMapContainer = d3.select("#geo")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  
// Bind the data to the SVG and create one path per GeoJSON feature
usMapContainer.selectAll("path")
  // stats is from us-states.js - required in as a file on index.html
  .data(states.features)
  .enter()
  .append("path")
  .attr("d", path)
  .style("stroke", "silver")
  .style("stroke-width", "1")
  .style("fill", "white")

// gender container
var genderContainer = d3.select("#gender")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

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
  var genderObj = {}

  // arrays since d3 needs arrays
  var cityStateArr = [];
  var ageBinArr = [];
  var newGenderArr = [];

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

  // take raw data and create a count by gender - throws error when i pass in filteredData???
  rawData.forEach((entry) => {
    if (genderObj[entry.gender]) {
      genderObj[entry.gender]++
    } else {
      genderObj[entry.gender] = 1
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

  // fill the gender array
  for (var key in genderObj) {
    if (key === 'Male' || key ==='Female' || key === 'LGBT') {
      newGenderArr.push({gender: key, count: genderObj[key]})
    }
  }

  // function for drawCityState
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

    usMapContainer.selectAll(".pin")
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
  }

  drawCityState(cityStateArr)

  // create an array to fit data into var pointsWanted points
  // only focusing on male/female/lgbt for infographic
  var totalPoints = genderObj.Male + genderObj.Female + genderObj.LGBT

  // gender stuff
  var genderMax = newGenderArr.reduce((memo, val) => {return Math.max(memo, val.count)}, -Infinity)
  var genderMin = newGenderArr.reduce((memo, val) => {return Math.min(memo, val.count)}, Infinity)

  var genderSize = d3.scale.linear()
    .domain([genderMin, genderMax])
    .range([100,150])
    .clamp(true);

  genderContainer.selectAll(".gender_dot")
    .data(newGenderArr)
    .enter()
    .append("circle", ".gender_dot")
    .attr("r", function(d) {return genderSize(d.count)})
    .attr("cy", height/2)
    .attr("cx", function(d, i) {return (i+1)*width/4})
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

  var genderImgSize = d3.scale.linear()
    .domain([genderMin, genderMax])
    .range([200,350])
    .clamp(true);

  genderContainer.selectAll(".gender_image")
    .data(newGenderArr)
    .enter()
    .append("svg:image", ".gender_image")
    .attr("xlink:href", function(d) {return d.gender === "Male" ? "http://cdn.mysitemyway.com/etc-mysitemyway/icons/legacy-previews/icons/magic-marker-icons-people-things/115809-magic-marker-icon-people-things-people-man4.png" : "http://cdn.mysitemyway.com/etc-mysitemyway/icons/legacy-previews/icons/magic-marker-icons-people-things/115822-magic-marker-icon-people-things-people-woman1.png"})
    .attr("width", function(d) {return genderImgSize(d.count)})
    .attr("height", function(d) {return genderImgSize(d.count)})
    .attr("y", function(d) {return height/2 - genderImgSize(d.count)/2})
    .attr("x", function(d, i) {return (i+1)*width/4 - genderImgSize(d.count)/2})


  genderContainer.selectAll(".gender_text")
    .data(newGenderArr)
    .enter()
    .append("text")
    .text(function(d) {
      return `${d.gender} (${Math.round(d.count/totalPoints*10000)/100}%)`
    })
    .attr("dy", ".35em")
    .attr("y", function(d) {return height/2 - (genderSize(d.count) + 15)})
    .attr("x", function(d, i) {return (i+1)*width/4})
    .attr("text-anchor", "middle")
    .attr("font-family", "Helvetica")  

    var pieContainerWidth = 960;
    var pieContainerHeight = 500;
    var pieRadius = 200;

    var pieColor = d3.scale.ordinal()
      .range(methinkOrdPal_7);

    var pieContainer = d3.select("#age")
      .append('svg')
      .attr("width", pieContainerWidth)
      .attr("height", pieContainerHeight)
      .append('g')
      .attr('transform', 'translate(' + (pieContainerWidth/2) + ',' + (pieContainerHeight/2) + ')')

    pieContainer.append("g")
      .attr("class", "slices");
    pieContainer.append("g")
      .attr("class", "labels");
    pieContainer.append("g")
      .attr("class", "lines");

    var arc = d3.svg.arc()
      .outerRadius(pieRadius*0.8)
      .innerRadius(pieRadius*0.2);

    var labelArc = d3.svg.arc()
      .outerRadius(pieRadius*0.9)
      .innerRadius(pieRadius*0.9);

    // converts data to data that can be used to make a pie chart
    var pie = d3.layout.pie()
      .value(function(d) {return d.count})
      .sort(function(a, b) {return a.order - b.order})

    // function for age distribution pie chart
    var drawPie = function(formattedData) {

      console.log('formattedData', formattedData)

      // create slices
      var slice = pieContainer.select('.slices').selectAll('path.slice')
        .data(pie(formattedData), key);

      slice.enter()
        .append('path')
        .style("stroke", "silver")
        .style("stroke-width", "1")
        .attr('fill', function(d) {
          return pieColor(d.data.ageBin)
        })
        .attr('class', 'slice');

      slice   
        .transition().duration(1000)
        .attrTween("d", function(d) {
          this._current = this._current || d;
          var interpolate = d3.interpolate(this._current, d);
          this._current = interpolate(0);
          return function(t) {
            return arc(interpolate(t));
          };
        })

      slice.exit()
        .remove();

      // label
      var text = pieContainer.select(".labels").selectAll("text")
        .data(pie(formattedData), key);

      text.enter()
        .append("text")
        .attr("dy", ".35em")
        .text(function(d) {
          return `${d.data.ageBin} (${d.data.percentage}%)`;
        });

      // label animation
      text.transition().duration(1000)
        .attr("font-family", "Helvetica")
        .attrTween("transform", function(d) {
          this._current = this._current || d;
          var interpolate = d3.interpolate(this._current, d);
          this._current = interpolate(0);
          return function(t) {
            var d2 = interpolate(t);
            var pos = labelArc.centroid(d2);
            pos[0] = pieRadius * ((d.endAngle + d.startAngle)/2 < Math.PI ? 1 : -1);
            return "translate("+ pos +")";
          };
        })
        .styleTween("text-anchor", function(d){
          this._current = this._current || d;
          var interpolate = d3.interpolate(this._current, d);
          this._current = interpolate(0);
          return function(t) {
            var d2 = interpolate(t);
            return (d.endAngle + d.startAngle)/2 < Math.PI ? "start":"end";
          };
        });

      text.exit()
        .remove();

      // lines to label
      var polyline = pieContainer.select(".lines").selectAll("polyline")
        .data(pie(formattedData), key)
        
      polyline.enter()
        .append("polyline")
        .attr("stroke", 'silver')
        .attr("stroke-width", "1.5")
        .attr("fill", "none")
      
      // line animation
      polyline.transition().duration(1000)
        .attrTween("points", function(d){
          this._current = this._current || d;
          var interpolate = d3.interpolate(this._current, d);
          this._current = interpolate(0);
          return function(t) {
            var d2 = interpolate(t);
            var pos = labelArc.centroid(d2);
            pos[0] = pieRadius * 0.95 * ((d.endAngle + d.startAngle)/2 < Math.PI ? 1 : -1);
            return [arc.centroid(d2), labelArc.centroid(d2), pos];
          };      
        });

      polyline.exit()
        .remove();
      
    }

    drawPie(ageBinArr)

    // function to create some random data from current data
    var randomData = function() {
      ageBinArr.forEach((entry) => {
        entry.count = Math.floor(entry.count * Math.random() * 5)
      })
      return ageBinArr
    }

    // button for refreshing data
    d3.select("#refresh")
      .on("click", function(){
        drawPie(randomData());
      });


}
