
var State = require("../state.js"),
  _ = require("../util.js"),
  stateFn = State.prototype.state;

function BaseMan( options ){

  options = options || {};

  this._states = {};

  this.strict = options.strict;
  this.title = options.title;

  if(options.routes) this.state(options.routes);

}

_.extend( _.emitable( BaseMan ), {
    // keep blank
    name: '',

    root: true,


    state: function(stateName){

      var active = this.active;
      var args = _.slice(arguments, 1);

      if(typeof stateName === "string" && active){
         stateName = stateName.replace("~", active.name);
         if(active.parent) stateName = stateName.replace("^", active.parent.name || "");
      }
      // ^ represent current.parent
      // ~ represent  current
      // only 
      args.unshift(stateName);
      return stateFn.apply(this, args);

    },

    decode: function(path, needLocation){

      var pathAndQuery = path.split("?");
      var query = this._findQuery(pathAndQuery[1]);
      path = pathAndQuery[0];
      var found = this._findState(this, path);
      if(found) _.extend(found.param, query);
      return found;

    },
    encode: function(stateName, param, needLink){
      var state = this.state(stateName);
      var history = this.history;
      if(!state) return;
      var url  = state.encode(param);
      
      return needLink? (history.mode!==2? history.prefix + url : url ): url;
    },
    // notify specify state
    // check the active statename whether to match the passed condition (stateName and param)
    is: function(stateName, param, isStrict){
      if(!stateName) return false;
      stateName = (stateName.name || stateName);
      var current = this.current, currentName = current.name;
      var matchPath = isStrict? currentName === stateName : (currentName + ".").indexOf(stateName + ".")===0;
      return matchPath && (!param || _.eql(param, this.param)); 
    },


    _wrapPromise: function( promise, next ){

      return promise.then( next, function(){ next(false); }) ;

    },

    _findQuery: function(querystr){

      var queries = querystr && querystr.split("&"), query= {};
      if(queries){
        var len = queries.length;
        for(var i =0; i< len; i++){
          var tmp = queries[i].split("=");
          query[tmp[0]] = tmp[1];
        }
      }
      return query;

    },
    _findState: function(state, path){
      var states = state._states, found, param;

      // leaf-state has the high priority upon branch-state
      if(state.hasNext){

        var stateList = _.values( states ).sort( this._sortState );
        var len = stateList.length;

        for(var i = 0; i < len; i++){

          found = this._findState( stateList[i], path );
          if( found ) return found;
        }

      }
      // in strict mode only leaf can be touched
      // if all children is don. will try it self
      param = state.regexp && state.decode(path);
      if(param){
        return {
          state: state,
          param: param
        }
      }else{
        return false;
      }
    },
    _sortState: function( a, b ){
      return ( b.priority || 0 ) - ( a.priority || 0 );
    },
    // find the same branch;
    _findBase: function(now, before){

      if(!now || !before || now == this || before == this) return this;
      var np = now, bp = before, tmp;
      while(np && bp){
        tmp = bp;
        while(tmp){
          if(np === tmp) return tmp;
          tmp = tmp.parent;
        }
        np = np.parent;
      }
    },

}, true);

module.exports = BaseMan;

