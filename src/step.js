var _ = require("./util.js");

function Step(options){
  _.extend(this, options || {});
}

var so = Step.prototype;

so.async = function(){
  this.asynced = true;
}

so.done = function(){
  if(this.oncompelete) this.oncompelete();
}

module.exports = Step;
