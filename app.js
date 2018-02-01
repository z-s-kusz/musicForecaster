var express = require("express");
var app = express();
var path = require('path');
var bodyParser = require('body-parser');

var anticipatedAlbums = require('./routes/scraper');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// Serve back static files
app.use(express.static(path.join(__dirname, './public')));

//routes
app.use('/anticipatedAlbums', anticipatedAlbums);

// start server
app.set('port', process.env.PORT || 5000);
app.listen(app.get('port'), function () {
  console.log('listening on port ', app.get('port'));
});

// Handle index file separately
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, './public/index.html'));
});
