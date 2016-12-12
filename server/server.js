var express = require("express")
var app = express();

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

var port = process.env.PORT || 1337;

app.listen(port, function() {
  console.log("listening on", port)
})

app.use(express.static('public'));

app.get('/items/:userid', function(req, res) {
  sendAllItem(req, res, req.params.userid);
});