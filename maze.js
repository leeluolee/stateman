/**
@author	undefined
@version	0.0.1
@homepage	https://github.com/leeluolee/maze
*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["Maze"] = factory();
	else
		root["Maze"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var Maze = __webpack_require__(1);


	Maze.Histery = __webpack_require__(2);
	Maze.util = __webpack_require__(3);
	Maze.State = __webpack_require__(4);
	Maze.Step = __webpack_require__(5);

	module.exports = Maze;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var State = __webpack_require__(4),
	  Histery = __webpack_require__(2),
	  brow = __webpack_require__(6),
	  Step = __webpack_require__(5),
	  _ = __webpack_require__(3);



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
	        if($notfound) this.go($notfound, { query: query });

	        return this.emit("state:404", { path: path, query: this.query});
	      }

	      this._go( found, { query: query, param: found.param } );

	      found.param = null;
	    },
	    // @TODO direct go the point state
	    go: function(state, option){
	      if(!option.silent){
	        option = state.getUrl(option)
	      }
	      this._go(state, option);
	    },

	    // goto the state with some option
	    _go: function(state, option){

	      if(typeof state === "string") state = this.state(state);

	      if(this.isGoing && this.curState){
	         console.error("step on [" + this.curState.stateName+ "] is not over")
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

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var browser = __webpack_require__(6);
	var _ = __webpack_require__(3);


	// the mode const
	var QUIRK = 3,
	  HASH = 1,
	  HISTORY = 2;


	// extract History for test
	// resolve the conficlt with the Native History
	function Histery(options){

	  // Trick from backbone.history for anchor-faked testcase 
	  this.location = options.location || browser.location;

	  // mode for start
	  this.mode = options.html5 && browser.history ? HISTORY: HASH; 
	  if( !browser.hash ) this.mode = this.mode | HISTORY;

	  // hash prefix , used for hash or quirk mode
	  this.prefix = "#" + (options.prefix || "") ;
	  this.rPrefix = new RegExp(this.prefix + '(.*)$');

	  // the root regexp for remove the root for the path. used in History mode
	  this.root = options.root ||  "/" ;
	  this.rRoot = new RegExp("^" +  this.root);

	  this.curPath = undefined;
	}

	_.extend( _.emitable(Histery), {
	  // check the 
	  start: function(){
	    this._checkPath = _.bind(this.checkPath, this);

	    if( this.isStart ) return;
	    this.isStart = true;

	    switch ( this.mode ){
	      case HASH: 
	        browser.on(window, "hashchange", this._checkPath); break;
	      case HISTORY:
	        browser.on(window, "popstate", this._checkPath); break;
	      case QUIRK:
	        this._checkLoop();
	    }

	    this.checkPath();
	  },
	  // the history teardown
	  stop: function(){

	    browser.off(window, 'hashchange', this._checkPath)  
	    browser.off(window, 'popstate', this._checkPath)  
	    clearTimeout(this.tid);
	    this.isStart = false;
	    this._checkPath = null;
	  },
	  // get the path modify
	  checkPath: function(){

	    var path = this.getPath();

	    if( path !== this.curPath ) {
	      this.emit('change', ( this.curPath = _.cleanPath(path)) );
	    }
	  },
	  // get the current path
	  getPath: function(){
	    var location = this.location, tmp;
	    if( this.mode !== HISTORY ){
	      tmp = location.href.match(this.rPrefix);
	      return tmp && tmp[1]? tmp[1]: "";

	    }else{
	      return _.cleanPath(( location.pathname + location.search || "" ).replace( this.rRoot, "/" ))
	    }
	  },

	  nav: function(to, options ){

	    options = options || {};

	    to = _.cleanPath(to);

	    if(this.curPath == to) return;

	    this.curPath = to;

	    // 3 or 1 is matched
	    if( this.mode !== HISTORY ){
	      this.location.hash = "#" + to;
	    }else{
	      history[ options.replace? 'replaceState': 'pushState' ]( {}, options.title || "" , _.cleanPath( this.root + to ) )
	    }

	    if(options.force) this.emit('change', to);
	  },
	  // for browser that not support onhashchange
	  _checkLoop: function(){

	    this.checkPath();
	    this.tid = setTimeout( _.bind( this._checkLoop, this ), this.delay || 66 );
	  }
	  
	})



	module.exports = Histery;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var _ = module.exports = {};
	var slice = [].slice, o2str = ({}).toString;


	// merge o2's properties to Object o1. 
	_.extend = function(o1, o2, override){
	  for(var i in o2) if(override || o1[i] === undefined){
	    o1[i] = o2[i]
	  }
	  return o1;
	}


	// Object.create shim
	_.ocreate = Object.create || function(o) {
	  var Foo = function(){};
	  Foo.prototype = o;
	  return new Foo;
	}


	_.slice = function(arr, index){
	  return slice.call(arr, index);
	}

	_.typeOf = function typeOf (o) {
	  return o == null ? String(o) : o2str.call(o).slice(8, -1).toLowerCase();
	}


	// small emitter 
	_.emitable = (function(){
	  var API = {
	    on: function(event, fn) {
	      if(typeof event === 'object'){
	        for (var i in event) {
	          this.on(i, event[i]);
	        }
	      }else{
	        var handles = this._handles || (this._handles = {}),
	          calls = handles[event] || (handles[event] = []);
	        calls.push(fn);
	      }
	      return this;
	    },
	    off: function(event, fn) {
	      if(!event || !this._handles) this._handles = {};
	      if(!this._handles) return;

	      var handles = this._handles , calls;

	      if (calls = handles[event]) {
	        if (!fn) {
	          handles[event] = [];
	          return this;
	        }
	        for (var i = 0, len = calls.length; i < len; i++) {
	          if (fn === calls[i]) {
	            calls.splice(i, 1);
	            return this;
	          }
	        }
	      }
	      return this;
	    },
	    emit: function(event){
	      var args = _.slice(arguments, 1),
	        handles = this._handles, calls;

	      if (!handles || !(calls = handles[event])) return this;
	      for (var i = 0, len = calls.length; i < len; i++) {
	        calls[i].apply(this, args)
	      }
	      return this;
	    }
	  }
	  return function(obj){
	      obj = typeof obj == "function" ? obj.prototype : obj;
	      return _.extend(obj, API)
	  }
	})();


	_.noop = function(){}

	_.bind = function(fn, context){
	  return function(){
	    return fn.apply(context, arguments);
	  }
	}

	var rDbSlash = /\/+/g, // double slash
	  rEndSlash = /\/$/;    // end slash

	_.cleanPath = function (path){
	  return ("/" + path).replace( rDbSlash,"/" ).replace( rEndSlash, "" );
	}

	// normalize the path
	function normalizePath(path) {
	  // means is from 
	  // (?:\:([\w-]+))?(?:\(([^\/]+?)\))|(\*{2,})|(\*(?!\*)))/g
	  var preIndex = 0;
	  var keys = [];
	  var index = 0;
	  var matches = "";

	  path = _.cleanPath(path);

	  var regStr = path
	    //  :id(capture)? | (capture)   |  ** | * 
	    .replace(/\:([\w-]+)(?:\(([^\/]+?)\))?|(?:\(([^\/]+)\))|(\*{2,})|(\*(?!\*))/g, 
	      function(all, key, keyformat, capture, mwild, swild, startAt) {
	        // move the uncaptured fragment in the path
	        if(startAt > preIndex) matches += path.slice(preIndex, startAt);
	        preIndex = startAt + all.length;
	        if( key ){
	          matches += "(" + key + ")";
	          keys.push(key)
	          return "("+( keyformat || "[\\w-]+")+")";
	        }
	        matches += "(" + index + ")";

	        keys.push( index++ );

	        if( capture ){
	           // sub capture detect
	          return "(" + capture +  ")";
	        } 
	        if(mwild) return "(.*)";
	        if(swild) return "([^\\/]*)";
	    })

	  if(preIndex !== path.length) matches += path.slice(preIndex)

	  return {
	    regexp: new RegExp("^" + regStr +"/?$"),
	    keys: keys,
	    matches: matches || path
	  }
	}


	_.normalize = normalizePath;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);

	function State(option){
	  this._states = {};
	  if(option) this.config(option);
	}


	_.extend( _.emitable( State ), {

	  state: function(stateName, config){
	    var current, next, nextName, states = this._states, i=0;

	    if( typeof stateName === "string" ) stateName = stateName.split(".");

	    var slen = stateName.length, current = this;


	    do{
	      nextName = stateName[i];
	      next = states[nextName];
	      if(!next){
	        if(!config) return;
	        next = states[nextName] = new State();
	        _.extend(next, {
	          parent: current,
	          stateName: stateName.join("."),
	          currentName: nextName
	        })
	        current.hasNext = true;
	        next.configUrl();
	      }
	      current = next;
	      states = next._states;
	    }while((++i) < slen )

	    if(config){
	       next.config(config);
	       return this;
	    } else {
	      return current;
	    }
	  },

	  config: function(configure){
	    if(!configure ) return;
	    configure = this._getConfig(configure);

	    for(var i in configure){
	      var prop = configure[i];
	      switch(i){
	        case "url": 
	          if(typeof prop === "string"){
	            this.url = prop;
	            this.configUrl();
	          }
	          break;
	        case "events": 
	          this.on(prop)
	          break;
	        default:
	          this[i] = prop;
	      }
	    }
	  },

	  // children override
	  _getConfig: function(configure){
	    return typeof configure === "function"? {enter: configure} : configure;
	  },
	  //from url 

	  configUrl: function(){
	    var url = "" , base = this, currentUrl;
	    var _watchedParam = [];

	    while( base ){

	      url = (typeof base.url === "string" ? base.url: (base.currentName || "")) + "/" + url;

	      if(base === this){
	        // url.replace(/\:([-\w]+)/g, function(all, capture){
	        //   _watchedParam.push()
	        // })
	        this._watchedParam = _watchedParam.concat(this.watched || []);
	      }
	      // means absolute;
	      if(url.indexOf("^/") === 0) {
	        url = url.slice(1);
	        break;
	      }
	      base = base.parent;
	    }
	    this.path = _.cleanPath("/" + url);
	    var pathAndQuery = this.path.split("?");
	    this.path = pathAndQuery[0];
	    // some Query we need watched
	    if(pathAndQuery[1]){
	      this._watchedQuery = pathAndQuery[1].split("&");
	    }

	    _.extend(this, _.normalize(this.path), true);
	  },
	  getUrl: function(option){
	    option = option || {};
	    var param = option.param || {},
	      query = option.query || {};


	    var url = this.matches.replace(/\(([\w-]+)\)/g, function(all, capture){
	      return param[capture] || "";
	    }) + "?";

	    for(var i in query) if( query.hasOwnProperty(i) ){
	      url += i + "=" + query[i] + "&";
	    }

	    return _.cleanPath( url.replace(/(?:\?|&)$/,"") )

	  },
	  match: function( path ){
	    var matched = this.regexp.exec(path),
	      keys = this.keys;

	    if(matched){

	      var param = {};
	      for(var i =0,len=keys.length;i<len;i++){
	        param[keys[i]] = matched[i+1] 
	      }
	      return param;
	    }else{
	      return false;
	    }
	  }

	})


	module.exports = State;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);

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


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	
	var win = window, 
	  doc = document;



	var b = module.exports = {
	  hash: "onhashchange" in win && (!doc.documentMode || doc.documentMode > 7),
	  history: win.history && "onpopstate" in win,
	  location: win.location,

	  on: "attachEvent" in win ? 
	      function(node,type,cb){return node.attachEvent( "on" + type, cb )}
	    : function(node,type,cb){return node.addEventListener( type, cb )},
	    
	  off: "detachEvent" in win ? 
	      function(node,type,cb){return node.detachEvent( "on" + type, cb )}
	    : function(node,type,cb){return node.removeEventListener( type, cb )}
	}




/***/ }
/******/ ])
});
