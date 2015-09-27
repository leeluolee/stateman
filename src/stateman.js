var State = require("./state.js"),
  Histery = require("./histery.js"),
  brow = require("./browser.js"),
  _ = require("./util.js"),
  baseTitle = document.title,
  stateFn = State.prototype.state;


function StateMan(options){

  if(this instanceof StateMan === false){ return new StateMan(options)}
  options = options || {};
  // if(options.history) this.history = options.history;

  this._states = {};
  this._stashCallback = [];
  this.strict = options.strict;
  this.current = this.active = this;
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
    // keep blank
    name: '',

    state: function(stateName, config){

      var active = this.active;
      if(typeof stateName === "string" && active){
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
    // @TODO direct go the point state
    go: function(state, option, callback){
      option = option || {};
      if(typeof state === "string") state = this.state(state);

      if(!state) return;

      if(typeof option === "function"){
        callback = option;
        option = {};
      }

      if(option.encode !== false){
        var url = state.encode(option.param)
        option.path = url;
        this.nav(url, {silent: true, replace: option.replace});
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

      options.path = url;

      this.history.nav( url, _.extend({silent: true}, options));
      if(!options.silent) this._afterPathChange( _.cleanPath(url) , options , callback)

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
      var state = this.state(stateName);
      return state? state.encode(param) : '';
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

      options = options || {};

      options.path = path;

      if(!found){
        // loc.nav("$default", {silent: true})
        return this._notfound(options);
      }

      options.param = found.param;

      this._go( found, options, callback );
    },
    _notfound: function(options){

      // var $notfound = this.state("$notfound");

      // if( $notfound ) this._go($notfound, options);

      return this.emit("notfound", options);
    },
    // goto the state with some option
    _go: function(state, option, callback){

      var over;

      // if(typeof state === "string") state = this.state(state);

      // if(!state) return _.log("destination is not defined")

      if(state.hasNext && this.strict) return this._notfound({name: state.name});

      // not touch the end in previous transtion

      // if( this.pending ){
      //   var pendingCurrent = this.pending.current;
      //   this.pending.stop();
      //   _.log("naving to [" + pendingCurrent.name + "] will be stoped, trying to ["+state.name+"] now");
      // }
      // if(this.active !== this.current){
      //   // we need return
      //   _.log("naving to [" + this.current.name + "] will be stoped, trying to ["+state.name+"] now");
      //   this.current = this.active;
      //   // back to before
      // }
      option.param = option.param || {};

      var current = this.current,
        baseState = this._findBase(current, state),
        prepath = this.path,
        self = this;


      if( typeof callback === "function" ) this._stashCallback.push(callback);
      // if we done the navigating when start
      function done(success){
        over = true;
        if( success !== false ) self.emit("end");
        self.pending = null;
        self._popStash(option);
      }
      
      option.previous = current;
      option.current = state;

      if(current !== state){
        option.stop = function(){
          done(false);
          self.nav( prepath? prepath: "/", {silent:true});
        }
        self.emit("begin", option);

      }
      // if we stop it in 'begin' listener
      if(over === true) return;

      if(current !== state){
        // option as transition object.

        option.phase = 'permission';
        this._walk(current, state, option, true , _.bind( function( notRejected ){

          if( notRejected===false ){
            // if reject in callForPermission, we will return to old 
            prepath && this.nav( prepath, {silent: true})

            done(false, 2)

            return this.emit('abort', option);

          } 

          // stop previous pending.
          if(this.pending) this.pending.stop() 
          this.pending = option;
          this.path = option.path;
          this.current = option.current;
          this.param = option.param;
          this.previous = option.previous;
          option.phase = 'navigation';
          this._walk(current, state, option, false, _.bind(function( notRejected ){

            if( notRejected === false ){
              this.current = this.active;
              done(false)
              return this.emit('abort', option);
            }


            this.active = option.current;

            option.phase = 'completion';
            return done()

          }, this) )

        }, this) )

      }else{
        self._checkQueryAndParam(baseState, option);
        this.pending = null;
        done();
      }
      
    },
    _popStash: function(option){

      var stash = this._stashCallback, len = stash.length;

      this._stashCallback = [];

      if(!len) return;

      for(var i = 0; i < len; i++){
        stash[i].call(this, option)
      }
    },

    // the transition logic  Used in Both canLeave canEnter && leave enter LifeCycle

    _walk: function(from, to, option, callForPermit , callback){

      // nothing -> app.state
      var parent = this._findBase(from , to);


      option.basckward = true;
      this._transit( from, parent, option, callForPermit , _.bind( function( notRejected ){

        if( notRejected === false ) return callback( notRejected );

        // only actual transiton need update base state;
        if( !callForPermit )  this._checkQueryAndParam(parent, option)

        option.basckward = false;
        this._transit( parent, to, option, callForPermit,  callback)

      }, this) )

    },

    _transit: function(from, to, option, callForPermit, callback){
      //  touch the ending
      if( from === to ) return callback();

      var back = from.name.length > to.name.length;
      var method = back? 'leave': 'enter';
      var applied;

      // use canEnter to detect permission
      if( callForPermit) method = 'can' + method.replace(/^\w/, function(a){ return a.toUpperCase() });

      var loop = _.bind(function( notRejected ){


        // stop transition or touch the end
        if( applied === to || notRejected === false ) return callback(notRejected);

        if( !applied ) {

          applied = back? from : this._computeNext(from, to);

        }else{

          applied = this._computeNext(applied, to);
        }

        if( (back && applied === to) || !applied )return callback( notRejected )

        this._moveOn( applied, method, option, loop );

      }, this);

      loop();
    },

    _moveOn: function( applied, method, option, callback){

      var isDone = false;
      var isPending = false;

      option.async = function(){

        isPending = true;

        return done;
      }

      function done( notRejected ){
        if( isDone ) return;
        isPending = false;
        isDone = true;
        callback( notRejected );
      }

      

      option.stop = function(){
        done( false );
      }


      this.active = applied;
      var retValue = applied[method]? applied[method]( option ): true;

      if(method === 'enter') applied.visited = true;
      // promise
      // need breadk , if we call option.stop first;

      if( _.isPromise(retValue) ){

        return this._wrapPromise(retValue, done); 

      }

      // if haven't call option.async yet
      if( !isPending ) done( retValue )

    },


    _wrapPromise: function( promise, next ){

      return promise.then( next, function(){next(false)}) ;

    },

    _computeNext: function( from, to ){

      var fname = from.name;
      var tname = to.name;

      var tsplit = tname.split('.')
      var fsplit = fname.split('.')

      var tlen = tsplit.length;
      var flen = fsplit.length;

      if(fname === '') flen = 0;
      if(tname === '') tlen = 0;

      if( flen < tlen ){
        fsplit[flen] = tsplit[flen];
      }else{
        fsplit.pop();
      }

      return this.state(fsplit.join('.'))

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

