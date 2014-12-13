var fs = require("fs");
module.exports = {
  "/**": function(req, res){
    var html  = fs.readFileSync("./fixtures/index.html", "utf8")
    res.send(html)
  }
}