/**
 * Module dependencies.
 */

var express = require("express");
var http = require('http');
var fs = require('fs');
var path = require('path');
var router = express.Router();

var app = express();

app.use(express['static'](path.join(__dirname, '../..'),{}));
app.use("/a",router)

router.get("*", function(req,res){
  res.send(fs.readFileSync("./index.html", "utf8"));
})


// process.env.LOGGER_LINE = true;

http.createServer(app).listen(8001,  function(err) {
  if(err) throw err
  console.log("start at http://localhost:8001")
});

