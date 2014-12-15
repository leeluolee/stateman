var State = require("./state.js"),
  Histery = require("./histery.js"),
  brow = require("./browser.js"),
  Step = require("./step.js"),
  _ = require("./util.js");



function Maze(options){
  if(this instanceof Maze === false){ return new Maze(options)}
  options = options || {};
  State.call(this);
  if(options.history) this.history = options.history;
  this.curState = this;
}


Maze.prototype = _.extend(

  _.ocreate(State.prototype), {

    constructor: Maze,

    nav: function(url, options){
      this.history.nav( url, options );
      return this;
    },

    // start Maze
    start: function(options){
      if( !this.history ) this.history = new Histery(options); 
      this.history.on("change", _.bind(this._afterPathChange, this));

      // if the history service is not runing, start it
      if(!this.history.isStart) this.history.start();
      return this;
    },
    // after pathchange changed
    _afterPathChange: function(path){

      var pathAndQuery = path.split("?");
      var queries = pathAndQuery[1] && pathAndQuery[1].split("&");
      var query = {};
      if(queries){
        var len = queries.length;
        for(;len--;){
          var tmp = queries[len].split("=");
          query[tmp[0]] = tmp[1];
        }
      }
      this.query = query;

      path = pathAndQuery[0];

      var found = this._findState(this, path);

      if(!found){
        // loc.nav("$default", {silent: true})
        var $notfound = this.state("$notfound");
        if($notfound) this.go($notfound, { query: query, param:{} , silent:true });

        return this.emit("state:404", { path: path, query: this.query});
      }

      this._go( found, { query: query, param: found.param||{} } );

      found.param = null;
    },
    // @TODO direct go the point state
    go: function(state, option){
      if(!option.silent){
        var url = state.getUrl(option)
        this.nav(url);
      }
      this._go(state, option);
    },

    // goto the state with some option
    _go: function(state, option){

      if(typeof state === "string") state = this.state(state);

      if(this.isGoing && this.curState){
        return;
         // console.error("step on [" + this.curState.stateName+ "] is not over")
      }

      var curState = this.curState,
        baseState = this._findBase(curState, state), 
        self = this;

      this.isGoing = true;
      this._leave(baseState, option, function(){
        self._enter(state, option, function(){
          self.isGoing = false;
        }) 
      })
      this._checkQueryAndParam(baseState, option);
    },
    _findState: function(state, path){
      var states = state._states, found, param;
      if(!state.hasNext){
        param = state.regexp && state.match(path);
      }
      if(param){
        state.param = param;
        return state;
      }else{
        for(var i in states) if(states.hasOwnProperty(i)){
          found = this._findState( states[i], path );
          if( found ) return found;
        }
        return false;
      }
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
      return this;
    },
    _enter: function(end, options, callback){

      callback = callback || _.noop;

      var current = this.curState || this;

      if(current == end) return callback();
      var stage = [], self = this;
      while(end !== current){
        stage.push(end);
        end = end.parent;
      }

      this._enterOne(stage, options, callback)
    },
    _enterOne: function(stage, options, callback){

      var cur = stage.pop(), self = this;
      if(!cur) return callback();

      this.curState = cur;

      var step = new Step(options);

      step.oncompelete = function(){
        self._enterOne(stage, options, callback)
      }

      if(!cur.enter) step.done();
      else {
        cur.enter(step);
        if(!step.asynced) step.done();
      }
    },
    _leave: function(end, options, callback){
      callback = callback || _.noop;
      if(end == this.curState) return callback();
      this._leaveOne(end, options,callback)
    },
    _leaveOne: function(end, options, callback){
      if(!end  || end === this.curState) return callback();
      var step = new Step(options);
      var self = this;
      step.oncompelete = function(){
        if(self.curState.parent) self.curState = self.curState.parent
        self._leaveOne(end, options, callback)
      }
      if(!this.curState.leave) step.done()
      else{
        this.curState.leave(step);
        if(!step.asynced) step.done();
      }
    },
    // check the query and Param
    _checkQueryAndParam: function(baseState, options){
      var from = baseState;
      while( from !== this ){
        from.update && from.update(options);
        from = from.parent;
      }
    }

})



module.exports = Maze;