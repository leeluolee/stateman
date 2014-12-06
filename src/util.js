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
  return path.replace( rDbSlash,"/" ).replace( rEndSlash, "" );
}

