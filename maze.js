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


	Maze.location = __webpack_require__(2);
	Maze.util = __webpack_require__(3);
	Maze.State = __webpack_require__(4);
	Maze.Step = __webpack_require__(5);

	module.exports = Maze;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var State = __webpack_require__(4),
	  loc = __webpack_require__(2),
	  brow = __webpack_require__(6),
	  Step = __webpack_require__(5),
	  _ = __webpack_require__(3);



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

	      if(this.isGoing && this.preState) return console.error("step on [" + this.preState.stateName+ "] is not over")

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

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	
	var browser = __webpack_require__(6);
	var _ = __webpack_require__(3);

	// the location exports
	var l = module.exports = {};


	// the mode const
	var QUIRK = 3,
	  HASH = 1,
	  HISTORY = 2;

	// All Regexp
	var rHash = /#(.*)$/;   // hash

	// regist the path change event
	var registers = [];


	// get the current Path from hash or location.url(mode === HISTORY)
	function getPath(path){

	  var tmp;
	  if(l.mode !== HISTORY){
	    tmp = location.href.match(rHash);
	    return tmp && tmp[1]? tmp[1]: "";

	  }else{
	    return _.cleanPath(( location.pathname + location.search || "" ).replace( l.rRoot, "/" ))
	  }
	}

	function loop(){
	  checkPath();
	  setTimeout(loop, 800);
	}


	// notifyAll registers when path changed 
	function notifyAll( path ){

	  var len = registers.length;

	  for( ;len-- ; ){
	    registers[len]( path );
	  }

	}

	// check the current path
	function checkPath(){
	  var path = getPath();
	  if(path !== l.currentPath) {
	    l.currentPath = _.cleanPath(path);
	    notifyAll(l.currentPath)
	  }
	}



	//whether the location is running already
	l.isStart = false;


	// default location's mode is hash
	// 
	//  - 1: `#/a/b`   hash
	//  - 2: `/a/b`   html5 history
	//  - 3: `#/a/b` hash in ie < 8
	l.mode = HASH;
	l.suffix = "";
	l.root = "/";
	l.currentPath = undefined;
	l.rRoot = null;


	// start the location detect
	// *the location service can  be only started once*
	// 
	l.start = function start( options ){
	  options = options || {};
	  if(l.isStart) return console.error("history is started");
	  else l.isStart = true;


	  l.mode = options.html5 && browser.history ? HISTORY: HASH; 
	  if( !browser.hash ) l.mode = l.mode | HISTORY;

	  l.root = options.root || "/";

	  if(options.suffix) l.suffix = options.suffix;
	  
	  l.rRoot = new RegExp("^" + l.suffix + l.root);

	  switch (l.mode){
	    case HASH: 
	      browser.on(window, "hashchange", checkPath); break;
	    case HISTORY:
	      browser.on(window, "popstate", checkPath); break;
	    case QUIRK:
	      loop();
	  }

	  // the initialized checking
	  checkPath();
	}

	l.nav = function(path, options){
	  options = options || {};

	  if(l.currentPath == path) return;

	  l.currentPath = path;

	  // 3 or 1 is matched
	  if(l.mode & HASH){
	    location.hash = "#" + path;

	  }else{
	    history.pushState({}, document.title, _.cleanPath(l.root + path))

	  }

	  if(!options.silent) notifyAll(path);
	}

	l.regist = function( cb ){
	  cb && registers.push(cb);
	}

















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
	      if(event) this._handles = [];
	      if(!this._handles) return;

	      var handles = this._handles, calls;

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



	var rDbSlash = /\/{1,}/g, // double slash
	  rEndSlash = /\/$/;    // end slash

	_.cleanPath = function (path){
	  return ("/" + path).replace( rDbSlash,"/" ).replace( rEndSlash, "" );
	}



/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);

	// normal lize the path
	function normalizeRegexp(path, keys){

	  if(_.typeOf(path) === "regexp") return path

	  var normPath = "^" + 
	    // the optional end lash
	    normalizePath(("/" + path + "/?"), keys) //
	      .replace(/([\/.])/g, '\\$1') 
	      .replace(/(\*{2,})|(\*(?!\*))/g, function(all, mult, single){

	        if(mult) return "(?:.*)";
	        else return "(?:[^\\/]*)";

	      }) + "$";

	  return new RegExp( normPath );
	}

	// normalize the path
	function normalizePath(path, keys, index) {
	  index = index || 0

	  return path.replace(/(\/)+/g, "\/") 
	    .replace(/(\/)?(?:(?:\((.+)\))|:([\w-]+)(?:\(([^:\(\)]+)\))?)/g, function(_, slash, capture, key, keyformat) {

	      if(capture){
	        keys && keys.push(index++)
	        var res = normalizePath(capture, keys, index) // sub capture detect
	        return (slash ? "(?:/(" : "(") + res + (slash ? "))" : ")")
	      }

	      keys && keys.push(key)
	      return (slash ? "(?:/" : "") + "("+(keyformat || "[\\w-]+")+")" + (slash ? ")" : "")
	    })

	}

	function State( ){
	  this._states = {};
	  this.keys = []
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
	      switch(i){
	        case "url": 
	          (this.url = configure[i]) && this.configUrl();
	          break;
	        case "events": 
	          this.on(configure[i])
	          break;
	        default:
	          this[i] = configure[i];
	      }
	    }
	  },

	  // children override
	  _getConfig: function(configure){
	    return typeof configure === "function"? {enter: configure} : configure;
	  },

	  configUrl: function(){
	    var url = "" , base = this, currentUrl;
	    var _watchedParam = [];

	    this.keys = [];


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
	    this.regexp = normalizeRegexp(this.path, this.keys);
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
	  on: "attachEvent" in win ? 
	      function(node,type,cb){return node.attachEvent( "on" + type, cb )}
	    : function(node,type,cb){return node.addEventListener( type, cb )}
	}




/***/ }
/******/ ])
});
