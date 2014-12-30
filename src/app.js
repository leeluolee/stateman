var Regular = require('regularjs');
var State = require("./state.js");

module.exports = Regular.extend({
  template: require("./app.html"),
  addState: function(stateName){
    var state = this.data.state;
    state.state(stateName, {});
  }
})



