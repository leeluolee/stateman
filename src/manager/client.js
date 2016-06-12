
var State = require("../state.js"),
  History = require("../history.js"),
  Base = require("./base.js"),
  _ = require("../util.js"),
  baseTitle = document.title,
  stateFn = State.prototype.state;

function StateMan(options){

  if(this instanceof StateMan === false){ return new StateMan(options); }
  options = options || {};
  Base.call(this, options);
  if(options.history) this.history = options.history;
  this._stashCallback = [];
  this.current = this.active = this;
  // auto update document.title, when navigation has been down
  this.on("end", function( options ){
    var cur = this.current;
    document.title = cur.getTitle( options ) ||  baseTitle  ;
  });
}

var o =_.inherit( StateMan, Base.prototype );

_.extend(o , {

    start: function(options, callback){

      this._startCallback = callback;
      if( !this.history ) this.history = new History(options); 
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
      var statename;
      if(typeof state === "string") {
         statename = state;
         state = this.state(state);
      }

      if(!state) return this._notfound({state:statename});

      if(typeof option === "function"){
        callback = option;
        option = {};
      }

      if(option.encode !== false){
        var url = state.encode(option.param);
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
      if(!options.silent) this._afterPathChange( _.cleanPath(url) , options , callback);

      return this;
    },

    // after pathchange changed
    // @TODO: afterPathChange need based on decode
    _afterPathChange: function(path, options ,callback){

      this.emit("history:change", path);

      var found = this.decode(path);

      options = options || {};

      options.path = path;

      if(!found){
        return this._notfound(options);
      }

      options.param = found.param;

      if( options.firstTime && !callback){
        callback =  this._startCallback;
        delete this._startCallback;
      }

      this._go( found.state, options, callback );
    },
    _notfound: function(options){


      return this.emit("notfound", options);
    },
    // goto the state with some option
    _go: function(state, option, callback){

      var over;

  

      if(state.hasNext && this.strict) return this._notfound({name: state.name});

  
      option.param = option.param || {};

      var current = this.current,
        baseState = this._findBase(current, state),
        prepath = this.path,
        self = this;


      if( typeof callback === "function" ) this._stashCallback.push(callback);
      // if we done the navigating when start
      function done(success){
        over = true;
        if( success !== false ) self.emit("end", option);
        self.pending = null;
        self._popStash(option);
      }
      
      option.previous = current;
      option.current = state;

      if(current !== state){
        option.stop = function(){
          done(false);
          self.nav( prepath? prepath: "/", {silent:true});
        };
        self.emit("begin", option);

      }
      // if we stop it in 'begin' listener
      if(over === true) return;

      option.phase = 'permission';
      this._walk(current, state, option, true , _.bind( function( notRejected ){

        if( notRejected===false ){
          // if reject in callForPermission, we will return to old 
          prepath && this.nav( prepath, {silent: true});

          done(false, 2);

          return this.emit('abort', option);

        } 

        // stop previous pending.
        if(this.pending) this.pending.stop();
        this.pending = option;
        this.path = option.path;
        this.current = option.current;
        this.param = option.param;
        this.previous = option.previous;
        option.phase = 'navigation';
        this._walk(current, state, option, false, _.bind(function( notRejected ){

          if( notRejected === false ){
            this.current = this.active;
            done(false);
            return this.emit('abort', option);
          }


          this.active = option.current;

          option.phase = 'completion';
          return done();

        }, this) );

      }, this) );


    },
    _popStash: function(option){

      var stash = this._stashCallback, len = stash.length;

      this._stashCallback = [];

      if(!len) return;

      for(var i = 0; i < len; i++){
        stash[i].call(this, option);
      }
    },

    // the transition logic  Used in Both canLeave canEnter && leave enter LifeCycle

    _walk: function(from, to, option, callForPermit , callback){
      // if(from === to) return callback();

      // nothing -> app.state
      var parent = this._findBase(from , to);
      var self = this;


      option.backward = true;
      this._transit( from, parent, option, callForPermit , function( notRejected ){

        if( notRejected === false ) return callback( notRejected );

        // only actual transiton need update base state;
        option.backward = false;
        self._walkUpdate(self, parent, option, callForPermit, function(notRejected){
          if(notRejected === false) return callback(notRejected);

          self._transit( parent, to, option, callForPermit,  callback);

        });

      });

    },

    _transit: function(from, to, option, callForPermit, callback){
      //  touch the ending
      if( from === to ) return callback();

      var back = from.name.length > to.name.length;
      var method = back? 'leave': 'enter';
      var applied;

      // use canEnter to detect permission
      if( callForPermit) method = 'can' + method.replace(/^\w/, function(a){ return a.toUpperCase(); });

      var loop = _.bind(function( notRejected ){


        // stop transition or touch the end
        if( applied === to || notRejected === false ) return callback(notRejected);

        if( !applied ) {

          applied = back? from : this._computeNext(from, to);

        }else{

          applied = this._computeNext(applied, to);
        }

        if( (back && applied === to) || !applied )return callback( notRejected );

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
      };

      function done( notRejected ){
        if( isDone ) return;
        isPending = false;
        isDone = true;
        callback( notRejected );
      }

      option.stop = function(){
        done( false );
      };


      this.active = applied;
      var retValue = applied[method]? applied[method]( option ): true;

      if(method === 'enter') applied.visited = true;
      // promise
      // need breadk , if we call option.stop first;

      if( _.isPromise(retValue) ){

        return this._wrapPromise(retValue, done); 

      }

      // if haven't call option.async yet
      if( !isPending ) done( retValue );

    },


    _wrapPromise: function( promise, next ){

      return promise.then( next, function(err){ 
        //TODO: 万一promise中throw了Error如何处理？
        if(err instanceof Error) throw err;
        next(false); 
      }) ;

    },

    _computeNext: function( from, to ){

      var fname = from.name;
      var tname = to.name;

      var tsplit = tname.split('.');
      var fsplit = fname.split('.');

      var tlen = tsplit.length;
      var flen = fsplit.length;

      if(fname === '') flen = 0;
      if(tname === '') tlen = 0;

      if( flen < tlen ){
        fsplit[flen] = tsplit[flen];
      }else{
        fsplit.pop();
      }

      return this.state(fsplit.join('.'));

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
    // check the query and Param
    _walkUpdate: function(baseState, to, options, callForPermit,  done){

      var method = callForPermit? 'canUpdate': 'update';
      var from = baseState;
      var self = this;

      var pathes = [], node = to;
      while(node !== this){
        pathes.push( node );
        node = node.parent;
      }

      var loop = function( notRejected ){
        if( notRejected === false ) return done( false );
        if( !pathes.length ) return done();
        from = pathes.pop();
        self._moveOn( from, method, options, loop )
      }

      self._moveOn( from, method, options, loop )
    }

}, true);

module.exports = StateMan;
