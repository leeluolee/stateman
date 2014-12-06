// 1. todo async
// 2. rewrite

void function (root, factory) {

  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    window.Cascade = factory();
  }
}(this, function() {

  var doc = document,
    history = window.history,
    co, noop = function(){},
    fo = Function.prototype,
    slice = [].slice;

  function typeOf (o) {
    return o == null ? String(o) : ({}).toString.call(o).slice(8, -1).toLowerCase();
  }

  function extend(o1, o2 ){
    for(var i in o2) if( o1[i] === undefined){
      o1[i] = o2[i]
    }
    return o1;
  }

  // CONST
  var isSupportHash = "onhashchange" in window && doc.documentMode > 7,
    isSupportHistory = history && "onpopstate" in window;

  var hasRouterInGlobal = false,
    isHistoryStart = false;

  var on = "attachEvent" in window ? 
      function(node,type,cb){return node.attachEvent( "on" + type, cb )}
    : function(node,type,cb){return node.addEventListener( type, cb )}

  var ocreate = Object.create || function(o){
    var foo = function(){};
    foo.prototype = o;
    return new foo;
  }




// small emitter 
var emitable = function(util){

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
      var args = slice.call(arguments, 1),
        handles = this._handles,
        calls;
      if (!handles || !(calls = handles[event])) return this;
      for (var i = 0, len = calls.length; i < len; i++) {
        calls[i].apply(this, args)
      }
      return this;
      }
    }
    return function(obj){
        obj = typeof obj == "function" ? obj.prototype : obj;
        return extend(obj, API)
    }
  }();


  function State( ){
    this._states = {};
    this.keys = []
  }


  extend( emitable(State), {

    state: function(stateName, config){
      var current, next, nextName, states = this._states, i=0;

      if( typeOf(stateName) === "string" ) stateName = stateName.split(".");

      var slen = stateName.length, current = this;

      do{
        nextName = stateName[i];
        next = states[nextName];
        if(!next){
          if(!config) return;
          next = states[nextName] = new State();
          extend(next, {
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

      var type = typeOf(configure);
      if(type === "function") configure = {enter: configure};

      for(var i in configure){
        switch(i){
          case "url": (this.url = configure[i]) && this.configUrl();
          case "events": this.on(configure[i])
          default:
            this[i] = configure[i];
        }
      }
    },

    configUrl: function(){
      var url = "" , base = this, currentUrl;
      var _watchedParam = [];

      this.keys = [];

      while( base ){

        url = (base.url || (base.currentName) || "") + "/" + url;

        if(base === this){
          url.replace(/\:([-\w]+)/g, function(all, capture){
            _watchedParam.push()
          })
          this._watchedParam = _watchedParam.concat(this.watched || []);
        }
        // means absolute;
        if(url.indexOf("^/") === 0) {
          url = url.slice(1);
          break;
        }
        base = base.parent;
      }
      this.path = hist.cleanPath("/" + url);
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
        param.$match = matched[0];

        for(var i =0,len=keys.length;i<len;i++){
          param[keys[i]] = matched[i+1] 
        }

        return param;
      }else{

        return false;
      }
    }

  })



  function Step(options){
    extend(this, options || {});
  }

  var so = Step.prototype;

  so.async = function(){
    this.asynced = true;
  }

  so.done = function(){
    if(this.oncompelete) this.oncompelete();
  }






  // wrapped history
  // ---------------
  var hist = function(){
    var isStart = false, 
      useHistory,
      useHash ,
      root="/",
      currentPath,
      callbacks = [];

    var rHash = /#(.*)$/,
      rDbSlash = /\/{1,}/g,
      rEndSlash = /\/$/,
      rRoot;

    function start(options){
      options = options || {};
      if(isHistoryStart) return console.error("history is started");
      isHistoryStart = true;
      useHistory = options.history && isSupportHistory;
      useHash = !options.history || (!isSupportHistory && isSupportHistory);

      root = options.root || "/";
      rRoot = new RegExp("^" + root);

      if(useHash){
        on(window, "hashchange", checkPath);
      }else if(useHistory){
        window.addEventListener("popstate", checkPath)
      // ie 6/7/8
      }else{
        loop()
      }
      checkPath();
    }

    function cleanPath(path){
      return path.replace(rDbSlash,"/").replace(rEndSlash, "");
    }

    function loop(){
      checkPath();
      setTimeout(loop, 60);
    }

    function nav(path){
      if(currentPath == path) return;
      currentPath = path;
      if(useHistory){
        history.pushState({}, document.title, cleanPath(root + path))
      }else{
        location.hash = "#" + path;
      }
      checkCallback(path);
    }

    function regist(callback){
      if( typeof callback === "function" ) callbacks.push(callback)
      return this;
    }
    // check the current path
    function checkPath(){
      var path = getPath();
      if(path !== currentPath) {
        currentPath = path;
        checkCallback(currentPath)
      }
    }

    function checkCallback(cur){
      for(var i = 0, len = callbacks.length; i < len ;i++){
        callbacks[i](cur);
      }
    }

    function getPath(){
      var tmp;
      if(!useHistory){
        tmp = location.href.match(rHash);
        return tmp && tmp[1]? tmp[1]: "";

      }else{
        return cleanPath(location.pathname + location.search||"")
          .replace(rRoot, "")
      }
    }

    return {
      nav: nav,
      start: start,
      regist: regist,
      cleanPath: cleanPath
    }
  }();


  Cascade.history = hist;


  return Cascade;
})
