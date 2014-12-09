var State = require("./state.js"),
  loc = require("./location.js"),
  brow = require("./browser.js"),
  Step = require("./step.js"),
  _ = require("./util.js");



function Maze(options){
  if(this instanceof Maze === false){ return new Maze(options)}
  options = options || {};
  State.call(this);
  this.options = options;
}


Maze.prototype = _.extend(

  _.ocreate(State.prototype), {

    constructor: Maze,

    nav: function(url, data){
      this.data = data;
      loc.nav(url);
      this.data = null;
    },

    // start Maze
    start: function(options){
      var self = this;
      this.preState = this;
      loc.regist(function(path){
        self._afterPathChange(path)
      });
      if(!loc.isStart) loc.start( options || {} );
      return this;
    },
    // goto the state with some data
    go: function(state, data){
      if(typeof state === "string") state = this.state(state);

      if(this.isGoing && this.preState){
         console.error("step on [" + this.preState.stateName+ "] is not over")
      }

      var preState = this.preState, baseState;
      var options = {
          param: this.param,
          query: this.query
      }

      data && _.extend(options.param, data, true);

      var baseState = this._findBase(preState, state), self = this;

      self.isGoing = true;
      this._leave(baseState, options, function(){
        self._enter(state, options, function(){
          self.isGoing = false;
        }) 
      })
      this._checkQueryAndParam(baseState, options);
    },
    // autolink: function(options){
    //   options = options || {};
    //   var self = this;
    //   var useHtml5 = options.html5 || (!options.hash && loc.mode === 2);
    //   if(!options.html5){
    //     brow.on(document.body, 'click', function(ev){
    //       var target = ev.target || ev.srcElement;
    //       if(target.tagName.toLowerCase() === "a"){
    //         var href = brow.getHref(target);
    //         if(){

    //         }
    //       }
    //     })
    //   }
    // },
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

      if(!found){
        // loc.nav("$default", {silent: true})
        var $notfound = this.state("$notfound");
        if($notfound) this.go($notfound, {});
        return this.emit("state:404", {path: path, query: this.query});
      }

      this.param = found.param;
      found.param = null;
      this.go(found, this.data);
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
      callback = callback || _.noop;
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
        from.update && from.update(options);
        from = from.parent;
      }
    }

})



module.exports = Maze;