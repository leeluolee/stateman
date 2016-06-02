var _ = module.exports = {};
var slice = [].slice, o2str = ({}).toString;

// merge o2's properties to Object o1. 
_.extend = function(o1, o2, override){
  for(var i in o2) if(override || o1[i] === undefined){
    o1[i] = o2[i];
  }
  return o1;
};

var rDot = /\./g;
_.countDot = function(word){
  var ret = word.match(rDot)
  return ret? ret.length: 0;
}

_.values = function( o, key){
  var keys = [];
  for(var i in o) if( o.hasOwnProperty(i) ){
    keys.push( key? i: o[i] );
  }
  return keys;
};

_.inherit = function( cstor, o ){
  function Faker(){}
  Faker.prototype = o;
  cstor.prototype = new Faker();
  cstor.prototype.constructor = cstor;
  return o;
}

_.slice = function(arr, index){
  return slice.call(arr, index);
};

_.typeOf = function typeOf (o) {
  return o == null ? String(o) : o2str.call(o).slice(8, -1).toLowerCase();
};

//strict eql
_.eql = function(o1, o2){
  var t1 = _.typeOf(o1), t2 = _.typeOf(o2);
  if( t1 !== t2) return false;
  if(t1 === 'object'){
    // only check the first's properties
    for(var i in o1){
      // Immediately return if a mismatch is found.
      if( o1[i] !== o2[i] ) return false;
    }
    return true;
  }
  return o1 === o2;
};

// small emitter 
_.emitable = (function(){
  function norm(ev){
    var eventAndNamespace = (ev||'').split(':');
    return {event: eventAndNamespace[0], namespace: eventAndNamespace[1]};
  }
  var API = {
    once: function(event, fn){
      var callback = function(){
        fn.apply(this, arguments);
        this.off(event, callback);
      };
      return this.on(event, callback);
    },
    on: function(event, fn) {
      if(typeof event === 'object'){
        for (var i in event) {
          this.on(i, event[i]);
        }
        return this;
      }
      var ne = norm(event);
      event=ne.event;
      if(event && typeof fn === 'function' ){
        var handles = this._handles || (this._handles = {}),
          calls = handles[event] || (handles[event] = []);
        fn._ns = ne.namespace;
        calls.push(fn);
      }
      return this;
    },
    off: function(event, fn) {
      var ne = norm(event); event = ne.event;
      if(!event || !this._handles) this._handles = {};

      var handles = this._handles;
      var calls = handles[event];

      if (calls) {
        if (!fn && !ne.namespace) {
          handles[event] = [];
        }else{
          for (var i = 0, len = calls.length; i < len; i++) {
            if ( (!fn || fn === calls[i]) && (!ne.namespace || calls[i]._ns === ne.namespace) ) {
              calls.splice(i, 1);
              return this;
            }
          }
        }
      }

      return this;
    },
    emit: function(event){
      var ne = norm(event); event = ne.event;

      var args = _.slice(arguments, 1),
        handles = this._handles, calls;

      if (!handles || !(calls = handles[event])) return this;
      for (var i = 0, len = calls.length; i < len; i++) {
        var fn = calls[i];
        if( !ne.namespace || fn._ns === ne.namespace ) fn.apply(this, args);
      }
      return this;
    }
  };
  return function(obj){
      obj = typeof obj == "function" ? obj.prototype : obj;
      return _.extend(obj, API);
  };
})();

_.bind = function(fn, context){
  return function(){
    return fn.apply(context, arguments);
  };
};

var rDbSlash = /\/+/g, // double slash
  rEndSlash = /\/$/;    // end slash

_.cleanPath = function (path){
  return ("/" + path).replace( rDbSlash,"/" ).replace( rEndSlash, "" ) || "/";
};

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
          keys.push(key);
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
    });

  if(preIndex !== path.length) matches += path.slice(preIndex);

  return {
    regexp: new RegExp("^" + regStr +"/?$"),
    keys: keys,
    matches: matches || path
  };
}

_.log = function(msg, type){
  typeof console !== "undefined" && console[type || "log"](msg); //eslint-disable-line no-console
};

_.isPromise = function( obj ){

  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

};

_.normalize = normalizePath;
