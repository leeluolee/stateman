var State = require("./state.js"),
  location = require("./location.js"),
  Step = require("./step.js"),
  _ = require("./util.js");



function Cascade(options){
  options = options || {};
  State.call(this);
  delete options.state;
  this.options = options;
}

Cascade.prototype = _.extend(

  _.ocreate(State.prototype), {

    constructor: Cascade,

    nav: function(url, data){
      this.data = data;
      location.nav(url);
      this.data = null;
    },

    // start cascade
    start: function(options){
      var self = this;
      this.preState = this;
      location.regist(function(path){
        self._afterPathChange(path)
      });
      if(!location.isStart) location.start( options || {} );
      return this;
    },

    // after hash (or url ) changed
    _afterPathChange: function(path, query){
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
      path = pathAndQuery[0]  ;

      this.query = query;

      var found = this._findState(this, path);
      var baseState = this, self = this;

      if(!found) return this.emit("cade: nofound", {path: path, query: this.query});

      this.param = found.param;
      found.param = null;
      this.go(found, this.data);
    },
    // goto the state with some data
    go: function(state, data){

      if(this.isGoing && this.preState) return console.error("step on [" + this.preState.stateName+ "] is not over")

      var preState = this.preState, baseState;
      var options = {
          param: this.param,
          query: this.query,
          data: this.data || {}
      }

      var baseState = this._findBase(preState, state), self = this;

      self.isGoing = true;
      this._leave(baseState, options, function(){
        self._enter(state, options, function(){
          self.isGoing = false;
        }) 
      })
      this._checkQueryAndParam(baseState, options);
    },
    _findState: function(state, path){
      var param = state.regexp && state.match(path),
        states = state._states, 
        found;
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
      var np = now, bp = before;
      var nnames = now.stateName.split("."), bnames = before.stateName.split(".");
      var len = Math.min(nnames.length, bnames.length);

      while(len--){
        if(bnames[len] === nnames[len]) return this.state(nnames.slice(0,len + 1))
      }

      return this;
    },
    _enter: function(end, options, callback){

      callback = callback || noop;

      var current = this.preState || this;

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

      this.preState = cur;

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
      callback = callback || noop;
      if(end == this.preState) return callback();
      this._leaveOne(end, options,callback)
    },
    _leaveOne: function(end, options, callback){
      if(!end  || end === this.preState) return callback();
      var step = new Step(options);
      var self = this;
      step.oncompelete = function(){
        if(self.preState.parent) self.preState = self.preState.parent
        self._leaveOne(end, options, callback)
      }
      if(!this.preState.leave) step.done()
      else{
        this.preState.leave(step);
        if(!step.asynced) step.done();
      }
    },
    // check the query and Param
    _checkQueryAndParam: function(baseState, options){
      var from = baseState;
      while( from !== this ){
        from.emit("state:update", options)
        from = from.parent;
      }
    }
})



module.exports = Cascade;