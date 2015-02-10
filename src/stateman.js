var State = require("./state.js"),
  Histery = require("./histery.js"),
  brow = require("./browser.js"),
  _ = require("./util.js"),
  baseTitle = document.title,
  stateFn = State.prototype.state;



function StateMan(options){
  if(this instanceof StateMan === false){ return new StateMan(options)}
  options = options || {};
  if(options.history) this.history = options.history;
  this._states = {};
  this._stashCallback = [];
  this.current = this.active = this;
  this.strict = options.strict;
  this.title = options.title;
  this.on("end", function(){
    var cur = this.current,title;
    while( cur ){
      title = cur.title;
      if(title) break; 
      cur = cur.parent;
    }
    document.title = typeof title === "function"? cur.title(): String( title || baseTitle ) ;
  })
}


_.extend( _.emitable( StateMan ), {
    // start StateMan

    state: function(stateName, config){
      var active = this.active;
      if(typeof stateName === "string" && active.name){
         stateName = stateName.replace("~", active.name)
         if(active.parent) stateName = stateName.replace("^", active.parent.name || "");
      }
      // ^ represent current.parent
      // ~ represent  current
      // only 
      return stateFn.apply(this, arguments);
    },
    start: function(options){
      if( !this.history ) this.history = new Histery(options); 
      if( !this.history.isStart ){
        this.history.on("change", _.bind(this._afterPathChange, this));
        this.history.start();
      } 
      return this;
    },
    stop: function(){
      this.history.stop();
    },
    async: function(){
      return this.active && this.active.async();
    },
    // @TODO direct go the point state
    go: function(state, option, callback){
      option = option || {};
      if(typeof state === "string") state = this.state(state);

      if(typeof option === "function"){
        callback = option;
        option = {};
      }

      if(option.encode !== false){
        var url = state.encode(option.param)
        this.nav(url, {silent: true, replace: option.replace});
        this.path = url;
      }
      this._go(state, option, callback);
      return this;
    },
    nav: function(url, options, callback){
      if(typeof options === "function"){
        callback = options;
        options = {};
      }
      options = options || {};
      // callback && (this._cb = callback)

      this.history.nav( url, _.extend({silent: true}, options));
      if(!options.silent) this._afterPathChange( _.cleanPath(url) , options , callback)
      // this._cb = null;
      return this;
    },
    decode: function(path){
      var pathAndQuery = path.split("?");
      var query = this._findQuery(pathAndQuery[1]);
      path = pathAndQuery[0];
      var state = this._findState(this, path);
      if(state) _.extend(state.param, query);
      return state;
    },
    encode: function(stateName, param){
      return this.state(stateName).encode(param);
    },
    // notify specify state
    // check the active statename whether to match the passed condition (stateName and param)
    is: function(stateName, param, isStrict){
      if(!stateName) return false;
      var stateName = (stateName.name || stateName);
      var current = this.current, currentName = current.name;
      var matchPath = isStrict? currentName === stateName : (currentName + ".").indexOf(stateName + ".")===0;
      return matchPath && (!param || _.eql(param, this.param)); 
    },
    // after pathchange changed
    // @TODO: afterPathChange need based on decode
    _afterPathChange: function(path, options ,callback){

      this.emit("history:change", path);


      var found = this.decode(path);

      this.path = path;

      options = options || {};

      if(!found){
        // loc.nav("$default", {silent: true})
        options.path = path;
        return this._notfound(options);
      }

      options.param = found.param;


      this._go( found, options, callback );
    },
    _notfound: function(options){
      var $notfound = this.state("$notfound");
      if($notfound) this._go($notfound, options);

      return this.emit("notfound", options);
    },
    // goto the state with some option
    _go: function(state, option, callback){
      var over;

      if(typeof state === "string") state = this.state(state);


      if(!state) return _.log("destination is not defined")
      if(state.hasNext && this.strict) return this._notfound({name: state.name});

      // not touch the end in previous transtion

      if(this.active !== this.current){
        // we need return

        _.log("naving to [" + this.current.name + "] will be stoped, trying to ["+state.name+"] now");
        if(this.active.done){
          this.active.done(false);
        }
        this.current = this.active;
        // back to before
      }
      option.param = option.param || {};
      this.param = option.param;

      var current = this.current,
        baseState = this._findBase(current, state),
        self = this;

      if( typeof callback === "function" ) this._stashCallback.push(callback);
      // if we done the navigating when start
      var done = function(success){
        over = true;
        self.current = self.active;
        if( success !== false ) self.emit("end");
        self._popStash();
      }
      
      if(current !== state){
        self.emit("begin", {
          previous: current,
          current: state,
          param: option.param,
          stop: function(){
            done(false);
          }
        });
        if(over === true){
          return current !== this && 
            this.nav(current.encode(current.param), {silent:true});
        }
        this.previous = current;
        this.current = state;
        this._leave(baseState, option, function(success){
          self._checkQueryAndParam(baseState, option);
          if(success === false) return done(success)
          self._enter(state, option, done)
        })
      }else{
        self._checkQueryAndParam(baseState, option);
        done();
      }
      
    },
    _popStash: function(){
      var stash = this._stashCallback, len = stash.length;
      this._stashCallback = [];
      if(!len) return;

      for(var i = 0; i < len; i++){
        stash[i].call(this)
      }

    },

    _findQuery: function(querystr){
      var queries = querystr && querystr.split("&"), query= {};
      if(queries){
        var len = queries.length;
        var query = {};
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
        for(var i in states) if(states.hasOwnProperty(i)){
          found = this._findState( states[i], path );
          if( found ) return found;
        }
      }
      // in strict mode only leaf can be touched
      // if all children is don. will try it self
      param = state.regexp && state.decode(path);
      if(param){
        state.param = param;
        return state;
      }else{
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

      var active = this.active;

      if(active == end) return callback();
      var stage = [];
      while(end !== active && end){
        stage.push(end);
        end = end.parent;
      }
      this._enterOne(stage, options, callback)
    },
    _enterOne: function(stage, options, callback){

      var cur = stage.pop(), self = this;
      if(!cur) return callback();

      this.active = cur;

      cur.done = function(success){
        cur._pending = false;
        cur.done = null;
        cur.visited = true;
        if(success !== false){
          self._enterOne(stage, options, callback)
          
        }else{
          return callback(success);
        }
      }

      if(!cur.enter) cur.done();
      else {
        var success = cur.enter(options);
        if(!cur._pending && cur.done) cur.done(success);
      }
    },
    _leave: function(end, options, callback){
      callback = callback || _.noop;
      if(end == this.active) return callback();
      this._leaveOne(end, options,callback)
    },
    _leaveOne: function(end, options, callback){
      if( end === this.active ) return callback();
      var cur = this.active, self = this;
      cur.done = function( success ){
        cur._pending = false;
        cur.done = null;
        if(success !== false){
          if(cur.parent) self.active = cur.parent;
          self._leaveOne(end, options, callback)
        }else{
          return callback(success);
        }
      }
      if(!cur.leave) cur.done();
      else{
        var success = cur.leave(options);
        if( !cur._pending && cur.done) cur.done(success);
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

}, true)



module.exports = StateMan;