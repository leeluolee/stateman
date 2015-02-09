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

//strict eql
_.eql = function(o1, o2){
  var t1 = _.typeOf(o1), t2 = _.typeOf(o2);
  if( t1 !== t2) return false;
  if(t1 === 'object'){
    var equal = true;
    // only check the first's propertie
    for(var i in o1){
      if( o1[i] !== o2[i] ) equal = false;
    }
    return equal;
  }
  return o1 === o2;
}


// small emitter 
_.emitable = (function(){
  var API = {
    once: function(event, fn){
      var callback = function(){
        fn.apply(this, arguments)
        this.off(event, callback)
      }
      return this.on(event, callback)
    },
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
  return ("/" + path).replace( rDbSlash,"/" ).replace( rEndSlash, "" ) || "/";
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

_.log = function(msg, type){
  typeof console !== "undefined" && console[type || "log"](msg)
}


_.normalize = normalizePath;

