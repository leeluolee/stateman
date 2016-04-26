
var _ = require("../util.js");
var Base = require('./base.js');

function ServerManager( options ){
  if(this instanceof ServerManager === false){ return new ServerManager(options); }
  Base.apply( this, arguments );
}

var o =_.inherit( ServerManager, Base.prototype );

_.extend(o , {
  exec: function ( path ){
    var found = this.decode(path);
    if( !found ) return;
    var param = found.param;

    //@FIXIT: We NEED decodeURIComponent in server side!!

    for(var i in param){
      if(typeof param[i] === 'string') param[i] = decodeURIComponent(param[i]);
    }
    var states = [];
    var state = found.state;
    this.current = state;

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


module.exports = ServerManager