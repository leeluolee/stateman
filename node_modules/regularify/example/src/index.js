var tpl =  require("./index.rgl");
var tpl2 =  require("./index2.txt");
var Regular = require("regularjs");


var Component = Regular.extend({
  template: tpl,
  data: {list: ['leeluolee', 'boday']}
})

var Component2 = Regular.extend({
  template: tpl2,
  data: {
    name: "hello"
  }
})


new Component().$inject("#app");
new Component2().$inject("#app");


