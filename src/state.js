var Regular = require('regularjs');



var State = Regular.extend({
  name: "state",
  template: require("./state.html"),
  config: function(){
    var self = this;
    var data = this.data, state = data.state;
    state.enter = function(){
      self.$update("actived", true);
    }
    state.leave = function(){
      self.$update("actived", false);
    }
  }
})

module.exports = State;