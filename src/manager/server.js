
var _ = require("../util.js");
var Base = require('./base.js');

function ServerManager(){
  if(this instanceof ServerManager === false){ return new ServerManager(options); }
  Base.apply(this, arguments);
}

var o =_.inherit( ServerManager, Base.prototype );

_.extend(o , {
  exec: function ( path ){
    var state = this.decode(path);
    var param = state.param;
    var states = [];
    if( !state ) return;

    while(state && !state.root){
      states.unshift( state );
      state = state.parent;
    }

    return {
      states: states,
      param: param
    }
  }
})


module.export = Server