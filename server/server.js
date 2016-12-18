var express = require("express")
var app = express();
var path = require("path")
// var db = require('../db/config');
var bodyParser = require('body-parser');
var routes = require('./config/routes')

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

var port = process.env.PORT || 1337;

routes(app, express)

app.listen(port, function() {
  console.log("listening on", port)
})

app.use(express.static('public'));

app.use(express.static('node_modules'));