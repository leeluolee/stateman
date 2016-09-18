/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	
	__webpack_require__(1);
	__webpack_require__(14);
	__webpack_require__(17);





/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var State = __webpack_require__(2);
	var expect = __webpack_require__(8)



	function expectUrl(url, option){
	  return expect(new State({url: url}).encode(option))
	}

	function expectMatch(url, path){
	  return expect(new State({url: url}).decode(path))
	}

	describe("State", function(){

	  describe("state.state", function(){
	    it("can defined nested statename that parentState is not defined", function(){
	      var state = new State();

	      state.state('contact.detail.message', {});

	      expect(state.state("contact").name).to.equal("contact")
	      expect(state.state("contact.detail").name).to.equal("contact.detail")
	      expect(state.state("contact.detail.message").name).to.equal("contact.detail.message")
	    })
	    it("we can define absolute url when start with '^'", function(){
	      var state = new State();
	      state.state('contact.detail', {});
	      state.state('contact.detail.app', {url: '^/home/code/:id'});
	      expect(state.state("contact.detail.app").encode({id: 1})).to.equal("/home/code/1")

	    })
	    it("state.async has been removed after v0.2.0", function(){
	      var state = new State();
	      expect(function(){
	        state.async()
	      }).to.throwError();
	      
	    })

	  })


	  describe("state.encode", function(){


	    it("no param and query should work", function(){

	      expectUrl("/home/code").to.equal("/home/code")

	      expectUrl("/home/code", {name: 'hello', age: 1} )
	        .to.equal("/home/code?name=hello&age=1");
	      
	    })
	    it("with uncatched param should work", function(){
	      
	      expectUrl("/home/code/:id").to.equal("/home/code")

	      expectUrl("/home/code/:id", {
	        id: 100, name: 'hello', age: 1
	      }).to.equal("/home/code/100?name=hello&age=1");
	      
	    })

	    it("with unnamed param should work", function(){
	      
	      expectUrl("/home/code/(\\d+)", {
	        name: 'hello', age: 1, 0:100
	      }).to.equal("/home/code/100?name=hello&age=1");
	    })

	    it("with named and catched param should work", function(){
	      
	      expectUrl("/home/code/:id(\\d+)", {
	        name: 'hello', 
	        age: 1, 
	        id: 100
	      }).to.equal("/home/code/100?name=hello&age=1");

	    })

	    it("with wildcard should work", function(){
	      
	      expectUrl("/home/**/code", {
	        name: 'hello', age: 1, 0: "/name/100"
	      }).to.equal("/home/name/100/code?name=hello&age=1");

	      expectUrl("/home/*/code", {
	        name: 'hello', age: 1, 0: "name"
	      }).to.equal("/home/name/code?name=hello&age=1");

	    })

	    it("complex testing should work as expect", function(){

	      expectUrl("/home/code/:id(\\d+)/:name/prefix(1|2|3)suffix/**", {
	        name: 'leeluolee', age: 1 ,id: 100,  0: 1, 1: "last"
	      }).to.equal("/home/code/100/leeluolee/prefix1suffix/last?age=1");

	    })

	    it("nested state testing", function(){
	      var state = new State({url: "home"})
	        .state("home", {})
	        .state("home.list", {url: ""})
	        .state("home.list.message", {url: "/:id/message"})

	      var url =state.state("home.list.message").encode({
	        id: 1000 ,name:1, age: "ten"
	      })
	      expect(url).to.equal("/home/home/1000/message?name=1&age=ten");
	    })


	  })


	  describe("state.match", function(){

	    it("basic usage", function(){
	      expectMatch("/home/code", "/home/code/").to.eql({});
	      expectMatch("/home/code", "/home/code").to.eql({});
	    })

	    it("simple named param", function(){
	      expectMatch("/home/code/:id", "/home/code/100/").to.eql({id:"100"});
	    })

	    it("simple catched param", function(){
	      expectMatch("/home/code/(\\d+)", "/home/code/100/").to.eql({0:"100"});
	    })

	    it("simple catched and named param", function(){
	      expectMatch("/home/code/:id(\\d+)", "/home/code/100/").to.eql({id:"100"});
	    })

	    it("simple wild param", function(){
	      expectMatch("/home/code/:id(\\d+)", "/home/code/100/").to.eql({id:"100"});
	    })

	    it("complex composite param", function(){

	      expectMatch("/home/code/:id(\\d+)/([0-9])/(\\d{1,3})/home-:name/*/level", 
	        "/home/code/100/1/44/home-hello/wild/level").to .eql({id:"100", "0": 1, "1": 44, "2": "wild",  name: "hello"});

	    })

	  })

	})


	describe("state.event", function(){
	  var state = new State();
	  it("event base", function(){
	    var locals = {on:0};
	    function callback(num){locals.on+=num||1}

	    state.on("change", callback);
	    state.emit("change", 2);
	    expect(locals.on).to.equal(2);
	    state.off("change", callback);
	    state.emit("change");
	    expect(locals.on).to.equal(2);
	  })
	  it("event once", function(){
	    var locals = {once:0};
	    function callback(num){locals.once+=num||1}

	    state.once("once", callback);
	    state.emit("once")
	    expect(locals.once).to.equal(1);
	    state.emit("once")
	    expect(locals.once).to.equal(1);
	  })
	  it("batch operate", function(){
	    var locals = {on:0};
	    function callback(name1,name2){locals.on+=name2||1}

	    state.on({
	      "change": callback,
	      "change2": callback
	    })

	    state.emit("change", 1,2);
	    expect(locals.on).to.equal(2);
	    state.emit("change2");
	    expect(locals.on).to.equal(3);

	    state.off();

	    state.emit("change");
	    expect(locals.on).to.equal(3);
	    state.emit("change2");
	    expect(locals.on).to.equal(3);
	  })
	})



/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);
	var Qs = __webpack_require__(4);

	function State(option)
	{
	    this._states = {};
	    this._pending = false;
	    this.visited = false;
	    if (option) this.config(option);
	}

	//regexp cache
	State.rCache = {};

	_.extend(_.emitable(State), {

	    state: function (stateName, config)
	    {
	        if (_.typeOf(stateName) === "object")
	        {
	            for (var i in stateName)
	            {
	                this.state(i, stateName[i])
	            }
	            return this;
	        }
	        var current, next, nextName, states = this._states, i = 0;

	        if (typeof stateName === "string") stateName = stateName.split(".");

	        var slen = stateName.length, current = this;
	        var stack = [];


	        do {
	            nextName = stateName[i];
	            next = states[nextName];
	            stack.push(nextName);
	            if (!next)
	            {
	                if (!config) return;
	                next = states[nextName] = new State();
	                _.extend(next, {
	                    parent: current,
	                    manager: current.manager || current,
	                    name: stack.join("."),
	                    currentName: nextName
	                });
	                current.hasNext = true;
	                next.configUrl();
	            }
	            current = next;
	            states = next._states;
	        } while ((++i) < slen);

	        if (config)
	        {
	            next.config(config);
	            return this;
	        } else
	        {
	            return current;
	        }
	    },

	    config: function (configure)
	    {

	        configure = this._getConfig(configure);

	        for (var i in configure)
	        {
	            var prop = configure[i];
	            switch (i)
	            {
	                case "url":
	                    if (typeof prop === "string")
	                    {
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
	    _getConfig: function (configure)
	    {
	        return typeof configure === "function" ? {enter: configure} : configure;
	    },

	    //from url

	    configUrl: function ()
	    {
	        var url = "", base = this, currentUrl;
	        var _watchedParam = [];

	        while (base)
	        {

	            url = (typeof base.url === "string" ? base.url : (base.currentName || "")) + "/" + url;

	            // means absolute;
	            if (url.indexOf("^/") === 0)
	            {
	                url = url.slice(1);
	                break;
	            }
	            base = base.parent;
	        }
	        this.pattern = _.cleanPath("/" + url);
	        var pathAndQuery = this.pattern.split("?");
	        this.pattern = pathAndQuery[0];
	        // some Query we need watched

	        _.extend(this, _.normalize(this.pattern), true);
	    },
	    encode: function (param)
	    {
	        var state = this;
	        var result = Qs.stringify(param);
	        return result;


	        // param = param || {};
	        //
	        // var matched = "%";
	        //
	        // var url = state.matches.replace(/\(([\w-]+)\)/g, function (all, capture)
	        //     {
	        //         var sec = param[capture] || "";
	        //         matched += capture + "%";
	        //         return sec;
	        //     }) + "?";
	        //
	        // // remained is the query, we need concat them after url as query
	        // for (var i in param)
	        // {
	        //     if (matched.indexOf("%" + i + "%") === -1) url += i + "=" + param[i] + "&";
	        // }
	        // return _.cleanPath(url.replace(/(?:\?|&)$/, ""))
	    },
	    decode: function (path)
	    {
	        var result = Qs.parse(path);
	        return result;

	        // var matched = this.regexp.exec(path),
	        //     keys = this.keys;
	        //
	        // if (matched)
	        // {
	        //     var param = {};
	        //     for (var i = 0, len = keys.length; i < len; i++)
	        //     {
	        //         param[keys[i]] = matched[i + 1]
	        //     }
	        //     return param;
	        // } else
	        // {
	        //     return false;
	        // }
	    },
	    // by default, all lifecycle is permitted

	    async: function ()
	    {
	        throw new Error('please use option.async instead')
	    }

	});

	module.exports = State;

/***/ },
/* 3 */
/***/ function(module, exports) {

	var _ = module.exports = {};
	var slice = [].slice, o2str = ({}).toString;


	// merge o2's properties to Object o1. 
	_.extend = function(o1, o2, override){
	  for(var i in o2) if(override || o1[i] === undefined){
	    o1[i] = o2[i]
	  }
	  return o1;
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
	    // only check the first's properties
	    for(var i in o1){
	      // Immediately return if a mismatch is found.
	      if( o1[i] !== o2[i] ) return false;
	    }
	    return true;
	  }
	  return o1 === o2;
	}


	// small emitter 
	_.emitable = (function(){
	  function norm(ev){
	    var eventAndNamespace = (ev||'').split(':');
	    return {event: eventAndNamespace[0], namespace: eventAndNamespace[1]}
	  }
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

	      var handles = this._handles , calls;

	      if (calls = handles[event]) {
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
	        if( !ne.namespace || fn._ns === ne.namespace ) fn.apply(this, args)
	      }
	      return this;
	    }
	  }
	  return function(obj){
	      obj = typeof obj == "function" ? obj.prototype : obj;
	      return _.extend(obj, API)
	  }
	})();



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

	_.isPromise = function( obj ){

	  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';

	}



	_.normalize = normalizePath;



/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Stringify = __webpack_require__(5);
	var Parse = __webpack_require__(7);

	module.exports = {
	    stringify: Stringify,
	    parse: Parse
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Utils = __webpack_require__(6);

	var arrayPrefixGenerators = {
	    brackets: function brackets(prefix) {
	        return prefix + '[]';
	    },
	    indices: function indices(prefix, key) {
	        return prefix + '[' + key + ']';
	    },
	    repeat: function repeat(prefix) {
	        return prefix;
	    }
	};

	var defaults = {
	    delimiter: '&',
	    strictNullHandling: false,
	    skipNulls: false,
	    encode: true,
	    encoder: Utils.encode
	};

	var stringify = function stringify(object, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots) {
	    var obj = object;
	    if (typeof filter === 'function') {
	        obj = filter(prefix, obj);
	    } else if (obj instanceof Date) {
	        obj = obj.toISOString();
	    } else if (obj === null) {
	        if (strictNullHandling) {
	            return encoder ? encoder(prefix) : prefix;
	        }

	        obj = '';
	    }

	    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || Utils.isBuffer(obj)) {
	        if (encoder) {
	            return [encoder(prefix) + '=' + encoder(obj)];
	        }
	        return [prefix + '=' + String(obj)];
	    }

	    var values = [];

	    if (typeof obj === 'undefined') {
	        return values;
	    }

	    var objKeys;
	    if (Array.isArray(filter)) {
	        objKeys = filter;
	    } else {
	        var keys = Object.keys(obj);
	        objKeys = sort ? keys.sort(sort) : keys;
	    }

	    for (var i = 0; i < objKeys.length; ++i) {
	        var key = objKeys[i];

	        if (skipNulls && obj[key] === null) {
	            continue;
	        }

	        if (Array.isArray(obj)) {
	            values = values.concat(stringify(obj[key], generateArrayPrefix(prefix, key), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots));
	        } else {
	            values = values.concat(stringify(obj[key], prefix + (allowDots ? '.' + key : '[' + key + ']'), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots));
	        }
	    }

	    return values;
	};

	module.exports = function (object, opts) {
	    var obj = object;
	    var options = opts || {};
	    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
	    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
	    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
	    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
	    var encoder = encode ? (typeof options.encoder === 'function' ? options.encoder : defaults.encoder) : null;
	    var sort = typeof options.sort === 'function' ? options.sort : null;
	    var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
	    var objKeys;
	    var filter;

	    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
	        throw new TypeError('Encoder has to be a function.');
	    }

	    if (typeof options.filter === 'function') {
	        filter = options.filter;
	        obj = filter('', obj);
	    } else if (Array.isArray(options.filter)) {
	        objKeys = filter = options.filter;
	    }

	    var keys = [];

	    if (typeof obj !== 'object' || obj === null) {
	        return '';
	    }

	    var arrayFormat;
	    if (options.arrayFormat in arrayPrefixGenerators) {
	        arrayFormat = options.arrayFormat;
	    } else if ('indices' in options) {
	        arrayFormat = options.indices ? 'indices' : 'repeat';
	    } else {
	        arrayFormat = 'indices';
	    }

	    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

	    if (!objKeys) {
	        objKeys = Object.keys(obj);
	    }

	    if (sort) {
	        objKeys.sort(sort);
	    }

	    for (var i = 0; i < objKeys.length; ++i) {
	        var key = objKeys[i];

	        if (skipNulls && obj[key] === null) {
	            continue;
	        }

	        keys = keys.concat(stringify(obj[key], key, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots));
	    }

	    return keys.join(delimiter);
	};


/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	var hexTable = (function () {
	    var array = new Array(256);
	    for (var i = 0; i < 256; ++i) {
	        array[i] = '%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase();
	    }

	    return array;
	}());

	exports.arrayToObject = function (source, options) {
	    var obj = options.plainObjects ? Object.create(null) : {};
	    for (var i = 0; i < source.length; ++i) {
	        if (typeof source[i] !== 'undefined') {
	            obj[i] = source[i];
	        }
	    }

	    return obj;
	};

	exports.merge = function (target, source, options) {
	    if (!source) {
	        return target;
	    }

	    if (typeof source !== 'object') {
	        if (Array.isArray(target)) {
	            target.push(source);
	        } else if (typeof target === 'object') {
	            target[source] = true;
	        } else {
	            return [target, source];
	        }

	        return target;
	    }

	    if (typeof target !== 'object') {
	        return [target].concat(source);
	    }

	    var mergeTarget = target;
	    if (Array.isArray(target) && !Array.isArray(source)) {
	        mergeTarget = exports.arrayToObject(target, options);
	    }

	    return Object.keys(source).reduce(function (acc, key) {
	        var value = source[key];

	        if (Object.prototype.hasOwnProperty.call(acc, key)) {
	            acc[key] = exports.merge(acc[key], value, options);
	        } else {
	            acc[key] = value;
	        }
	        return acc;
	    }, mergeTarget);
	};

	exports.decode = function (str) {
	    try {
	        return decodeURIComponent(str.replace(/\+/g, ' '));
	    } catch (e) {
	        return str;
	    }
	};

	exports.encode = function (str) {
	    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
	    // It has been adapted here for stricter adherence to RFC 3986
	    if (str.length === 0) {
	        return str;
	    }

	    var string = typeof str === 'string' ? str : String(str);

	    var out = '';
	    for (var i = 0; i < string.length; ++i) {
	        var c = string.charCodeAt(i);

	        if (
	            c === 0x2D || // -
	            c === 0x2E || // .
	            c === 0x5F || // _
	            c === 0x7E || // ~
	            (c >= 0x30 && c <= 0x39) || // 0-9
	            (c >= 0x41 && c <= 0x5A) || // a-z
	            (c >= 0x61 && c <= 0x7A) // A-Z
	        ) {
	            out += string.charAt(i);
	            continue;
	        }

	        if (c < 0x80) {
	            out = out + hexTable[c];
	            continue;
	        }

	        if (c < 0x800) {
	            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
	            continue;
	        }

	        if (c < 0xD800 || c >= 0xE000) {
	            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
	            continue;
	        }

	        i += 1;
	        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
	        out += hexTable[0xF0 | (c >> 18)] + hexTable[0x80 | ((c >> 12) & 0x3F)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)];
	    }

	    return out;
	};

	exports.compact = function (obj, references) {
	    if (typeof obj !== 'object' || obj === null) {
	        return obj;
	    }

	    var refs = references || [];
	    var lookup = refs.indexOf(obj);
	    if (lookup !== -1) {
	        return refs[lookup];
	    }

	    refs.push(obj);

	    if (Array.isArray(obj)) {
	        var compacted = [];

	        for (var i = 0; i < obj.length; ++i) {
	            if (obj[i] && typeof obj[i] === 'object') {
	                compacted.push(exports.compact(obj[i], refs));
	            } else if (typeof obj[i] !== 'undefined') {
	                compacted.push(obj[i]);
	            }
	        }

	        return compacted;
	    }

	    var keys = Object.keys(obj);
	    for (var j = 0; j < keys.length; ++j) {
	        var key = keys[j];
	        obj[key] = exports.compact(obj[key], refs);
	    }

	    return obj;
	};

	exports.isRegExp = function (obj) {
	    return Object.prototype.toString.call(obj) === '[object RegExp]';
	};

	exports.isBuffer = function (obj) {
	    if (obj === null || typeof obj === 'undefined') {
	        return false;
	    }

	    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Utils = __webpack_require__(6);

	var has = Object.prototype.hasOwnProperty;

	var defaults = {
	    delimiter: '&',
	    depth: 5,
	    arrayLimit: 20,
	    parameterLimit: 1000,
	    strictNullHandling: false,
	    plainObjects: false,
	    allowPrototypes: false,
	    allowDots: false,
	    decoder: Utils.decode
	};

	var parseValues = function parseValues(str, options) {
	    var obj = {};
	    var parts = str.split(options.delimiter, options.parameterLimit === Infinity ? undefined : options.parameterLimit);

	    for (var i = 0; i < parts.length; ++i) {
	        var part = parts[i];
	        var pos = part.indexOf(']=') === -1 ? part.indexOf('=') : part.indexOf(']=') + 1;

	        var key, val;
	        if (pos === -1) {
	            key = options.decoder(part);
	            val = options.strictNullHandling ? null : '';
	        } else {
	            key = options.decoder(part.slice(0, pos));
	            val = options.decoder(part.slice(pos + 1));
	        }
	        if (has.call(obj, key)) {
	            obj[key] = [].concat(obj[key]).concat(val);
	        } else {
	            obj[key] = val;
	        }
	    }

	    return obj;
	};

	var parseObject = function parseObject(chain, val, options) {
	    if (!chain.length) {
	        return val;
	    }

	    var root = chain.shift();

	    var obj;
	    if (root === '[]') {
	        obj = [];
	        obj = obj.concat(parseObject(chain, val, options));
	    } else {
	        obj = options.plainObjects ? Object.create(null) : {};
	        var cleanRoot = root[0] === '[' && root[root.length - 1] === ']' ? root.slice(1, root.length - 1) : root;
	        var index = parseInt(cleanRoot, 10);
	        if (
	            !isNaN(index) &&
	            root !== cleanRoot &&
	            String(index) === cleanRoot &&
	            index >= 0 &&
	            (options.parseArrays && index <= options.arrayLimit)
	        ) {
	            obj = [];
	            obj[index] = parseObject(chain, val, options);
	        } else {
	            obj[cleanRoot] = parseObject(chain, val, options);
	        }
	    }

	    return obj;
	};

	var parseKeys = function parseKeys(givenKey, val, options) {
	    if (!givenKey) {
	        return;
	    }

	    // Transform dot notation to bracket notation
	    var key = options.allowDots ? givenKey.replace(/\.([^\.\[]+)/g, '[$1]') : givenKey;

	    // The regex chunks

	    var parent = /^([^\[\]]*)/;
	    var child = /(\[[^\[\]]*\])/g;

	    // Get the parent

	    var segment = parent.exec(key);

	    // Stash the parent if it exists

	    var keys = [];
	    if (segment[1]) {
	        // If we aren't using plain objects, optionally prefix keys
	        // that would overwrite object prototype properties
	        if (!options.plainObjects && has.call(Object.prototype, segment[1])) {
	            if (!options.allowPrototypes) {
	                return;
	            }
	        }

	        keys.push(segment[1]);
	    }

	    // Loop through children appending to the array until we hit depth

	    var i = 0;
	    while ((segment = child.exec(key)) !== null && i < options.depth) {
	        i += 1;
	        if (!options.plainObjects && has.call(Object.prototype, segment[1].replace(/\[|\]/g, ''))) {
	            if (!options.allowPrototypes) {
	                continue;
	            }
	        }
	        keys.push(segment[1]);
	    }

	    // If there's a remainder, just add whatever is left

	    if (segment) {
	        keys.push('[' + key.slice(segment.index) + ']');
	    }

	    return parseObject(keys, val, options);
	};

	module.exports = function (str, opts) {
	    var options = opts || {};

	    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
	        throw new TypeError('Decoder has to be a function.');
	    }

	    options.delimiter = typeof options.delimiter === 'string' || Utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
	    options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
	    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
	    options.parseArrays = options.parseArrays !== false;
	    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
	    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : defaults.allowDots;
	    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
	    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
	    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
	    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

	    if (str === '' || str === null || typeof str === 'undefined') {
	        return options.plainObjects ? Object.create(null) : {};
	    }

	    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
	    var obj = options.plainObjects ? Object.create(null) : {};

	    // Iterate over the keys and setup the new object

	    var keys = Object.keys(tempObj);
	    for (var i = 0; i < keys.length; ++i) {
	        var key = keys[i];
	        var newObj = parseKeys(key, tempObj[key], options);
	        obj = Utils.merge(obj, newObj, options);
	    }

	    return Utils.compact(obj);
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module, Buffer) {(function (global, module) {

	  var exports = module.exports;

	  /**
	   * Exports.
	   */

	  module.exports = expect;
	  expect.Assertion = Assertion;

	  /**
	   * Exports version.
	   */

	  expect.version = '0.3.1';

	  /**
	   * Possible assertion flags.
	   */

	  var flags = {
	      not: ['to', 'be', 'have', 'include', 'only']
	    , to: ['be', 'have', 'include', 'only', 'not']
	    , only: ['have']
	    , have: ['own']
	    , be: ['an']
	  };

	  function expect (obj) {
	    return new Assertion(obj);
	  }

	  /**
	   * Constructor
	   *
	   * @api private
	   */

	  function Assertion (obj, flag, parent) {
	    this.obj = obj;
	    this.flags = {};

	    if (undefined != parent) {
	      this.flags[flag] = true;

	      for (var i in parent.flags) {
	        if (parent.flags.hasOwnProperty(i)) {
	          this.flags[i] = true;
	        }
	      }
	    }

	    var $flags = flag ? flags[flag] : keys(flags)
	      , self = this;

	    if ($flags) {
	      for (var i = 0, l = $flags.length; i < l; i++) {
	        // avoid recursion
	        if (this.flags[$flags[i]]) continue;

	        var name = $flags[i]
	          , assertion = new Assertion(this.obj, name, this)

	        if ('function' == typeof Assertion.prototype[name]) {
	          // clone the function, make sure we dont touch the prot reference
	          var old = this[name];
	          this[name] = function () {
	            return old.apply(self, arguments);
	          };

	          for (var fn in Assertion.prototype) {
	            if (Assertion.prototype.hasOwnProperty(fn) && fn != name) {
	              this[name][fn] = bind(assertion[fn], assertion);
	            }
	          }
	        } else {
	          this[name] = assertion;
	        }
	      }
	    }
	  }

	  /**
	   * Performs an assertion
	   *
	   * @api private
	   */

	  Assertion.prototype.assert = function (truth, msg, error, expected) {
	    var msg = this.flags.not ? error : msg
	      , ok = this.flags.not ? !truth : truth
	      , err;

	    if (!ok) {
	      err = new Error(msg.call(this));
	      if (arguments.length > 3) {
	        err.actual = this.obj;
	        err.expected = expected;
	        err.showDiff = true;
	      }
	      throw err;
	    }

	    this.and = new Assertion(this.obj);
	  };

	  /**
	   * Check if the value is truthy
	   *
	   * @api public
	   */

	  Assertion.prototype.ok = function () {
	    this.assert(
	        !!this.obj
	      , function(){ return 'expected ' + i(this.obj) + ' to be truthy' }
	      , function(){ return 'expected ' + i(this.obj) + ' to be falsy' });
	  };

	  /**
	   * Creates an anonymous function which calls fn with arguments.
	   *
	   * @api public
	   */

	  Assertion.prototype.withArgs = function() {
	    expect(this.obj).to.be.a('function');
	    var fn = this.obj;
	    var args = Array.prototype.slice.call(arguments);
	    return expect(function() { fn.apply(null, args); });
	  };

	  /**
	   * Assert that the function throws.
	   *
	   * @param {Function|RegExp} callback, or regexp to match error string against
	   * @api public
	   */

	  Assertion.prototype.throwError =
	  Assertion.prototype.throwException = function (fn) {
	    expect(this.obj).to.be.a('function');

	    var thrown = false
	      , not = this.flags.not;

	    try {
	      this.obj();
	    } catch (e) {
	      if (isRegExp(fn)) {
	        var subject = 'string' == typeof e ? e : e.message;
	        if (not) {
	          expect(subject).to.not.match(fn);
	        } else {
	          expect(subject).to.match(fn);
	        }
	      } else if ('function' == typeof fn) {
	        fn(e);
	      }
	      thrown = true;
	    }

	    if (isRegExp(fn) && not) {
	      // in the presence of a matcher, ensure the `not` only applies to
	      // the matching.
	      this.flags.not = false;
	    }

	    var name = this.obj.name || 'fn';
	    this.assert(
	        thrown
	      , function(){ return 'expected ' + name + ' to throw an exception' }
	      , function(){ return 'expected ' + name + ' not to throw an exception' });
	  };

	  /**
	   * Checks if the array is empty.
	   *
	   * @api public
	   */

	  Assertion.prototype.empty = function () {
	    var expectation;

	    if ('object' == typeof this.obj && null !== this.obj && !isArray(this.obj)) {
	      if ('number' == typeof this.obj.length) {
	        expectation = !this.obj.length;
	      } else {
	        expectation = !keys(this.obj).length;
	      }
	    } else {
	      if ('string' != typeof this.obj) {
	        expect(this.obj).to.be.an('object');
	      }

	      expect(this.obj).to.have.property('length');
	      expectation = !this.obj.length;
	    }

	    this.assert(
	        expectation
	      , function(){ return 'expected ' + i(this.obj) + ' to be empty' }
	      , function(){ return 'expected ' + i(this.obj) + ' to not be empty' });
	    return this;
	  };

	  /**
	   * Checks if the obj exactly equals another.
	   *
	   * @api public
	   */

	  Assertion.prototype.be =
	  Assertion.prototype.equal = function (obj) {
	    this.assert(
	        obj === this.obj
	      , function(){ return 'expected ' + i(this.obj) + ' to equal ' + i(obj) }
	      , function(){ return 'expected ' + i(this.obj) + ' to not equal ' + i(obj) });
	    return this;
	  };

	  /**
	   * Checks if the obj sortof equals another.
	   *
	   * @api public
	   */

	  Assertion.prototype.eql = function (obj) {
	    this.assert(
	        expect.eql(this.obj, obj)
	      , function(){ return 'expected ' + i(this.obj) + ' to sort of equal ' + i(obj) }
	      , function(){ return 'expected ' + i(this.obj) + ' to sort of not equal ' + i(obj) }
	      , obj);
	    return this;
	  };

	  /**
	   * Assert within start to finish (inclusive).
	   *
	   * @param {Number} start
	   * @param {Number} finish
	   * @api public
	   */

	  Assertion.prototype.within = function (start, finish) {
	    var range = start + '..' + finish;
	    this.assert(
	        this.obj >= start && this.obj <= finish
	      , function(){ return 'expected ' + i(this.obj) + ' to be within ' + range }
	      , function(){ return 'expected ' + i(this.obj) + ' to not be within ' + range });
	    return this;
	  };

	  /**
	   * Assert typeof / instance of
	   *
	   * @api public
	   */

	  Assertion.prototype.a =
	  Assertion.prototype.an = function (type) {
	    if ('string' == typeof type) {
	      // proper english in error msg
	      var n = /^[aeiou]/.test(type) ? 'n' : '';

	      // typeof with support for 'array'
	      this.assert(
	          'array' == type ? isArray(this.obj) :
	            'regexp' == type ? isRegExp(this.obj) :
	              'object' == type
	                ? 'object' == typeof this.obj && null !== this.obj
	                : type == typeof this.obj
	        , function(){ return 'expected ' + i(this.obj) + ' to be a' + n + ' ' + type }
	        , function(){ return 'expected ' + i(this.obj) + ' not to be a' + n + ' ' + type });
	    } else {
	      // instanceof
	      var name = type.name || 'supplied constructor';
	      this.assert(
	          this.obj instanceof type
	        , function(){ return 'expected ' + i(this.obj) + ' to be an instance of ' + name }
	        , function(){ return 'expected ' + i(this.obj) + ' not to be an instance of ' + name });
	    }

	    return this;
	  };

	  /**
	   * Assert numeric value above _n_.
	   *
	   * @param {Number} n
	   * @api public
	   */

	  Assertion.prototype.greaterThan =
	  Assertion.prototype.above = function (n) {
	    this.assert(
	        this.obj > n
	      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n }
	      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n });
	    return this;
	  };

	  /**
	   * Assert numeric value below _n_.
	   *
	   * @param {Number} n
	   * @api public
	   */

	  Assertion.prototype.lessThan =
	  Assertion.prototype.below = function (n) {
	    this.assert(
	        this.obj < n
	      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n }
	      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n });
	    return this;
	  };

	  /**
	   * Assert string value matches _regexp_.
	   *
	   * @param {RegExp} regexp
	   * @api public
	   */

	  Assertion.prototype.match = function (regexp) {
	    this.assert(
	        regexp.exec(this.obj)
	      , function(){ return 'expected ' + i(this.obj) + ' to match ' + regexp }
	      , function(){ return 'expected ' + i(this.obj) + ' not to match ' + regexp });
	    return this;
	  };

	  /**
	   * Assert property "length" exists and has value of _n_.
	   *
	   * @param {Number} n
	   * @api public
	   */

	  Assertion.prototype.length = function (n) {
	    expect(this.obj).to.have.property('length');
	    var len = this.obj.length;
	    this.assert(
	        n == len
	      , function(){ return 'expected ' + i(this.obj) + ' to have a length of ' + n + ' but got ' + len }
	      , function(){ return 'expected ' + i(this.obj) + ' to not have a length of ' + len });
	    return this;
	  };

	  /**
	   * Assert property _name_ exists, with optional _val_.
	   *
	   * @param {String} name
	   * @param {Mixed} val
	   * @api public
	   */

	  Assertion.prototype.property = function (name, val) {
	    if (this.flags.own) {
	      this.assert(
	          Object.prototype.hasOwnProperty.call(this.obj, name)
	        , function(){ return 'expected ' + i(this.obj) + ' to have own property ' + i(name) }
	        , function(){ return 'expected ' + i(this.obj) + ' to not have own property ' + i(name) });
	      return this;
	    }

	    if (this.flags.not && undefined !== val) {
	      if (undefined === this.obj[name]) {
	        throw new Error(i(this.obj) + ' has no property ' + i(name));
	      }
	    } else {
	      var hasProp;
	      try {
	        hasProp = name in this.obj
	      } catch (e) {
	        hasProp = undefined !== this.obj[name]
	      }

	      this.assert(
	          hasProp
	        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name) }
	        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name) });
	    }

	    if (undefined !== val) {
	      this.assert(
	          val === this.obj[name]
	        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name)
	          + ' of ' + i(val) + ', but got ' + i(this.obj[name]) }
	        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name)
	          + ' of ' + i(val) });
	    }

	    this.obj = this.obj[name];
	    return this;
	  };

	  /**
	   * Assert that the array contains _obj_ or string contains _obj_.
	   *
	   * @param {Mixed} obj|string
	   * @api public
	   */

	  Assertion.prototype.string =
	  Assertion.prototype.contain = function (obj) {
	    if ('string' == typeof this.obj) {
	      this.assert(
	          ~this.obj.indexOf(obj)
	        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
	        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
	    } else {
	      this.assert(
	          ~indexOf(this.obj, obj)
	        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
	        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
	    }
	    return this;
	  };

	  /**
	   * Assert exact keys or inclusion of keys by using
	   * the `.own` modifier.
	   *
	   * @param {Array|String ...} keys
	   * @api public
	   */

	  Assertion.prototype.key =
	  Assertion.prototype.keys = function ($keys) {
	    var str
	      , ok = true;

	    $keys = isArray($keys)
	      ? $keys
	      : Array.prototype.slice.call(arguments);

	    if (!$keys.length) throw new Error('keys required');

	    var actual = keys(this.obj)
	      , len = $keys.length;

	    // Inclusion
	    ok = every($keys, function (key) {
	      return ~indexOf(actual, key);
	    });

	    // Strict
	    if (!this.flags.not && this.flags.only) {
	      ok = ok && $keys.length == actual.length;
	    }

	    // Key string
	    if (len > 1) {
	      $keys = map($keys, function (key) {
	        return i(key);
	      });
	      var last = $keys.pop();
	      str = $keys.join(', ') + ', and ' + last;
	    } else {
	      str = i($keys[0]);
	    }

	    // Form
	    str = (len > 1 ? 'keys ' : 'key ') + str;

	    // Have / include
	    str = (!this.flags.only ? 'include ' : 'only have ') + str;

	    // Assertion
	    this.assert(
	        ok
	      , function(){ return 'expected ' + i(this.obj) + ' to ' + str }
	      , function(){ return 'expected ' + i(this.obj) + ' to not ' + str });

	    return this;
	  };

	  /**
	   * Assert a failure.
	   *
	   * @param {String ...} custom message
	   * @api public
	   */
	  Assertion.prototype.fail = function (msg) {
	    var error = function() { return msg || "explicit failure"; }
	    this.assert(false, error, error);
	    return this;
	  };

	  /**
	   * Function bind implementation.
	   */

	  function bind (fn, scope) {
	    return function () {
	      return fn.apply(scope, arguments);
	    }
	  }

	  /**
	   * Array every compatibility
	   *
	   * @see bit.ly/5Fq1N2
	   * @api public
	   */

	  function every (arr, fn, thisObj) {
	    var scope = thisObj || global;
	    for (var i = 0, j = arr.length; i < j; ++i) {
	      if (!fn.call(scope, arr[i], i, arr)) {
	        return false;
	      }
	    }
	    return true;
	  }

	  /**
	   * Array indexOf compatibility.
	   *
	   * @see bit.ly/a5Dxa2
	   * @api public
	   */

	  function indexOf (arr, o, i) {
	    if (Array.prototype.indexOf) {
	      return Array.prototype.indexOf.call(arr, o, i);
	    }

	    if (arr.length === undefined) {
	      return -1;
	    }

	    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0
	        ; i < j && arr[i] !== o; i++);

	    return j <= i ? -1 : i;
	  }

	  // https://gist.github.com/1044128/
	  var getOuterHTML = function(element) {
	    if ('outerHTML' in element) return element.outerHTML;
	    var ns = "http://www.w3.org/1999/xhtml";
	    var container = document.createElementNS(ns, '_');
	    var xmlSerializer = new XMLSerializer();
	    var html;
	    if (document.xmlVersion) {
	      return xmlSerializer.serializeToString(element);
	    } else {
	      container.appendChild(element.cloneNode(false));
	      html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
	      container.innerHTML = '';
	      return html;
	    }
	  };

	  // Returns true if object is a DOM element.
	  var isDOMElement = function (object) {
	    if (typeof HTMLElement === 'object') {
	      return object instanceof HTMLElement;
	    } else {
	      return object &&
	        typeof object === 'object' &&
	        object.nodeType === 1 &&
	        typeof object.nodeName === 'string';
	    }
	  };

	  /**
	   * Inspects an object.
	   *
	   * @see taken from node.js `util` module (copyright Joyent, MIT license)
	   * @api private
	   */

	  function i (obj, showHidden, depth) {
	    var seen = [];

	    function stylize (str) {
	      return str;
	    }

	    function format (value, recurseTimes) {
	      // Provide a hook for user-specified inspect functions.
	      // Check that value is an object with an inspect function on it
	      if (value && typeof value.inspect === 'function' &&
	          // Filter out the util module, it's inspect function is special
	          value !== exports &&
	          // Also filter out any prototype objects using the circular check.
	          !(value.constructor && value.constructor.prototype === value)) {
	        return value.inspect(recurseTimes);
	      }

	      // Primitive types cannot have properties
	      switch (typeof value) {
	        case 'undefined':
	          return stylize('undefined', 'undefined');

	        case 'string':
	          var simple = '\'' + json.stringify(value).replace(/^"|"$/g, '')
	                                                   .replace(/'/g, "\\'")
	                                                   .replace(/\\"/g, '"') + '\'';
	          return stylize(simple, 'string');

	        case 'number':
	          return stylize('' + value, 'number');

	        case 'boolean':
	          return stylize('' + value, 'boolean');
	      }
	      // For some reason typeof null is "object", so special case here.
	      if (value === null) {
	        return stylize('null', 'null');
	      }

	      if (isDOMElement(value)) {
	        return getOuterHTML(value);
	      }

	      // Look up the keys of the object.
	      var visible_keys = keys(value);
	      var $keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

	      // Functions without properties can be shortcutted.
	      if (typeof value === 'function' && $keys.length === 0) {
	        if (isRegExp(value)) {
	          return stylize('' + value, 'regexp');
	        } else {
	          var name = value.name ? ': ' + value.name : '';
	          return stylize('[Function' + name + ']', 'special');
	        }
	      }

	      // Dates without properties can be shortcutted
	      if (isDate(value) && $keys.length === 0) {
	        return stylize(value.toUTCString(), 'date');
	      }
	      
	      // Error objects can be shortcutted
	      if (value instanceof Error) {
	        return stylize("["+value.toString()+"]", 'Error');
	      }

	      var base, type, braces;
	      // Determine the object type
	      if (isArray(value)) {
	        type = 'Array';
	        braces = ['[', ']'];
	      } else {
	        type = 'Object';
	        braces = ['{', '}'];
	      }

	      // Make functions say that they are functions
	      if (typeof value === 'function') {
	        var n = value.name ? ': ' + value.name : '';
	        base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
	      } else {
	        base = '';
	      }

	      // Make dates with properties first say the date
	      if (isDate(value)) {
	        base = ' ' + value.toUTCString();
	      }

	      if ($keys.length === 0) {
	        return braces[0] + base + braces[1];
	      }

	      if (recurseTimes < 0) {
	        if (isRegExp(value)) {
	          return stylize('' + value, 'regexp');
	        } else {
	          return stylize('[Object]', 'special');
	        }
	      }

	      seen.push(value);

	      var output = map($keys, function (key) {
	        var name, str;
	        if (value.__lookupGetter__) {
	          if (value.__lookupGetter__(key)) {
	            if (value.__lookupSetter__(key)) {
	              str = stylize('[Getter/Setter]', 'special');
	            } else {
	              str = stylize('[Getter]', 'special');
	            }
	          } else {
	            if (value.__lookupSetter__(key)) {
	              str = stylize('[Setter]', 'special');
	            }
	          }
	        }
	        if (indexOf(visible_keys, key) < 0) {
	          name = '[' + key + ']';
	        }
	        if (!str) {
	          if (indexOf(seen, value[key]) < 0) {
	            if (recurseTimes === null) {
	              str = format(value[key]);
	            } else {
	              str = format(value[key], recurseTimes - 1);
	            }
	            if (str.indexOf('\n') > -1) {
	              if (isArray(value)) {
	                str = map(str.split('\n'), function (line) {
	                  return '  ' + line;
	                }).join('\n').substr(2);
	              } else {
	                str = '\n' + map(str.split('\n'), function (line) {
	                  return '   ' + line;
	                }).join('\n');
	              }
	            }
	          } else {
	            str = stylize('[Circular]', 'special');
	          }
	        }
	        if (typeof name === 'undefined') {
	          if (type === 'Array' && key.match(/^\d+$/)) {
	            return str;
	          }
	          name = json.stringify('' + key);
	          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	            name = name.substr(1, name.length - 2);
	            name = stylize(name, 'name');
	          } else {
	            name = name.replace(/'/g, "\\'")
	                       .replace(/\\"/g, '"')
	                       .replace(/(^"|"$)/g, "'");
	            name = stylize(name, 'string');
	          }
	        }

	        return name + ': ' + str;
	      });

	      seen.pop();

	      var numLinesEst = 0;
	      var length = reduce(output, function (prev, cur) {
	        numLinesEst++;
	        if (indexOf(cur, '\n') >= 0) numLinesEst++;
	        return prev + cur.length + 1;
	      }, 0);

	      if (length > 50) {
	        output = braces[0] +
	                 (base === '' ? '' : base + '\n ') +
	                 ' ' +
	                 output.join(',\n  ') +
	                 ' ' +
	                 braces[1];

	      } else {
	        output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	      }

	      return output;
	    }
	    return format(obj, (typeof depth === 'undefined' ? 2 : depth));
	  }

	  expect.stringify = i;

	  function isArray (ar) {
	    return Object.prototype.toString.call(ar) === '[object Array]';
	  }

	  function isRegExp(re) {
	    var s;
	    try {
	      s = '' + re;
	    } catch (e) {
	      return false;
	    }

	    return re instanceof RegExp || // easy case
	           // duck-type for context-switching evalcx case
	           typeof(re) === 'function' &&
	           re.constructor.name === 'RegExp' &&
	           re.compile &&
	           re.test &&
	           re.exec &&
	           s.match(/^\/.*\/[gim]{0,3}$/);
	  }

	  function isDate(d) {
	    return d instanceof Date;
	  }

	  function keys (obj) {
	    if (Object.keys) {
	      return Object.keys(obj);
	    }

	    var keys = [];

	    for (var i in obj) {
	      if (Object.prototype.hasOwnProperty.call(obj, i)) {
	        keys.push(i);
	      }
	    }

	    return keys;
	  }

	  function map (arr, mapper, that) {
	    if (Array.prototype.map) {
	      return Array.prototype.map.call(arr, mapper, that);
	    }

	    var other= new Array(arr.length);

	    for (var i= 0, n = arr.length; i<n; i++)
	      if (i in arr)
	        other[i] = mapper.call(that, arr[i], i, arr);

	    return other;
	  }

	  function reduce (arr, fun) {
	    if (Array.prototype.reduce) {
	      return Array.prototype.reduce.apply(
	          arr
	        , Array.prototype.slice.call(arguments, 1)
	      );
	    }

	    var len = +this.length;

	    if (typeof fun !== "function")
	      throw new TypeError();

	    // no value to return if no initial value and an empty array
	    if (len === 0 && arguments.length === 1)
	      throw new TypeError();

	    var i = 0;
	    if (arguments.length >= 2) {
	      var rv = arguments[1];
	    } else {
	      do {
	        if (i in this) {
	          rv = this[i++];
	          break;
	        }

	        // if array contains no values, no initial value to return
	        if (++i >= len)
	          throw new TypeError();
	      } while (true);
	    }

	    for (; i < len; i++) {
	      if (i in this)
	        rv = fun.call(null, rv, this[i], i, this);
	    }

	    return rv;
	  }

	  /**
	   * Asserts deep equality
	   *
	   * @see taken from node.js `assert` module (copyright Joyent, MIT license)
	   * @api private
	   */

	  expect.eql = function eql(actual, expected) {
	    // 7.1. All identical values are equivalent, as determined by ===.
	    if (actual === expected) {
	      return true;
	    } else if ('undefined' != typeof Buffer
	      && Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
	      if (actual.length != expected.length) return false;

	      for (var i = 0; i < actual.length; i++) {
	        if (actual[i] !== expected[i]) return false;
	      }

	      return true;

	      // 7.2. If the expected value is a Date object, the actual value is
	      // equivalent if it is also a Date object that refers to the same time.
	    } else if (actual instanceof Date && expected instanceof Date) {
	      return actual.getTime() === expected.getTime();

	      // 7.3. Other pairs that do not both pass typeof value == "object",
	      // equivalence is determined by ==.
	    } else if (typeof actual != 'object' && typeof expected != 'object') {
	      return actual == expected;
	    // If both are regular expression use the special `regExpEquiv` method
	    // to determine equivalence.
	    } else if (isRegExp(actual) && isRegExp(expected)) {
	      return regExpEquiv(actual, expected);
	    // 7.4. For all other Object pairs, including Array objects, equivalence is
	    // determined by having the same number of owned properties (as verified
	    // with Object.prototype.hasOwnProperty.call), the same set of keys
	    // (although not necessarily the same order), equivalent values for every
	    // corresponding key, and an identical "prototype" property. Note: this
	    // accounts for both named and indexed properties on Arrays.
	    } else {
	      return objEquiv(actual, expected);
	    }
	  };

	  function isUndefinedOrNull (value) {
	    return value === null || value === undefined;
	  }

	  function isArguments (object) {
	    return Object.prototype.toString.call(object) == '[object Arguments]';
	  }

	  function regExpEquiv (a, b) {
	    return a.source === b.source && a.global === b.global &&
	           a.ignoreCase === b.ignoreCase && a.multiline === b.multiline;
	  }

	  function objEquiv (a, b) {
	    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
	      return false;
	    // an identical "prototype" property.
	    if (a.prototype !== b.prototype) return false;
	    //~~~I've managed to break Object.keys through screwy arguments passing.
	    //   Converting to array solves the problem.
	    if (isArguments(a)) {
	      if (!isArguments(b)) {
	        return false;
	      }
	      a = pSlice.call(a);
	      b = pSlice.call(b);
	      return expect.eql(a, b);
	    }
	    try{
	      var ka = keys(a),
	        kb = keys(b),
	        key, i;
	    } catch (e) {//happens when one is a string literal and the other isn't
	      return false;
	    }
	    // having the same number of owned properties (keys incorporates hasOwnProperty)
	    if (ka.length != kb.length)
	      return false;
	    //the same set of keys (although not necessarily the same order),
	    ka.sort();
	    kb.sort();
	    //~~~cheap key test
	    for (i = ka.length - 1; i >= 0; i--) {
	      if (ka[i] != kb[i])
	        return false;
	    }
	    //equivalent values for every corresponding key, and
	    //~~~possibly expensive deep test
	    for (i = ka.length - 1; i >= 0; i--) {
	      key = ka[i];
	      if (!expect.eql(a[key], b[key]))
	         return false;
	    }
	    return true;
	  }

	  var json = (function () {
	    "use strict";

	    if ('object' == typeof JSON && JSON.parse && JSON.stringify) {
	      return {
	          parse: nativeJSON.parse
	        , stringify: nativeJSON.stringify
	      }
	    }

	    var JSON = {};

	    function f(n) {
	        // Format integers to have at least two digits.
	        return n < 10 ? '0' + n : n;
	    }

	    function date(d, key) {
	      return isFinite(d.valueOf()) ?
	          d.getUTCFullYear()     + '-' +
	          f(d.getUTCMonth() + 1) + '-' +
	          f(d.getUTCDate())      + 'T' +
	          f(d.getUTCHours())     + ':' +
	          f(d.getUTCMinutes())   + ':' +
	          f(d.getUTCSeconds())   + 'Z' : null;
	    }

	    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
	        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
	        gap,
	        indent,
	        meta = {    // table of character substitutions
	            '\b': '\\b',
	            '\t': '\\t',
	            '\n': '\\n',
	            '\f': '\\f',
	            '\r': '\\r',
	            '"' : '\\"',
	            '\\': '\\\\'
	        },
	        rep;


	    function quote(string) {

	  // If the string contains no control characters, no quote characters, and no
	  // backslash characters, then we can safely slap some quotes around it.
	  // Otherwise we must also replace the offending characters with safe escape
	  // sequences.

	        escapable.lastIndex = 0;
	        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
	            var c = meta[a];
	            return typeof c === 'string' ? c :
	                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
	        }) + '"' : '"' + string + '"';
	    }


	    function str(key, holder) {

	  // Produce a string from holder[key].

	        var i,          // The loop counter.
	            k,          // The member key.
	            v,          // The member value.
	            length,
	            mind = gap,
	            partial,
	            value = holder[key];

	  // If the value has a toJSON method, call it to obtain a replacement value.

	        if (value instanceof Date) {
	            value = date(key);
	        }

	  // If we were called with a replacer function, then call the replacer to
	  // obtain a replacement value.

	        if (typeof rep === 'function') {
	            value = rep.call(holder, key, value);
	        }

	  // What happens next depends on the value's type.

	        switch (typeof value) {
	        case 'string':
	            return quote(value);

	        case 'number':

	  // JSON numbers must be finite. Encode non-finite numbers as null.

	            return isFinite(value) ? String(value) : 'null';

	        case 'boolean':
	        case 'null':

	  // If the value is a boolean or null, convert it to a string. Note:
	  // typeof null does not produce 'null'. The case is included here in
	  // the remote chance that this gets fixed someday.

	            return String(value);

	  // If the type is 'object', we might be dealing with an object or an array or
	  // null.

	        case 'object':

	  // Due to a specification blunder in ECMAScript, typeof null is 'object',
	  // so watch out for that case.

	            if (!value) {
	                return 'null';
	            }

	  // Make an array to hold the partial results of stringifying this object value.

	            gap += indent;
	            partial = [];

	  // Is the value an array?

	            if (Object.prototype.toString.apply(value) === '[object Array]') {

	  // The value is an array. Stringify every element. Use null as a placeholder
	  // for non-JSON values.

	                length = value.length;
	                for (i = 0; i < length; i += 1) {
	                    partial[i] = str(i, value) || 'null';
	                }

	  // Join all of the elements together, separated with commas, and wrap them in
	  // brackets.

	                v = partial.length === 0 ? '[]' : gap ?
	                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
	                    '[' + partial.join(',') + ']';
	                gap = mind;
	                return v;
	            }

	  // If the replacer is an array, use it to select the members to be stringified.

	            if (rep && typeof rep === 'object') {
	                length = rep.length;
	                for (i = 0; i < length; i += 1) {
	                    if (typeof rep[i] === 'string') {
	                        k = rep[i];
	                        v = str(k, value);
	                        if (v) {
	                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
	                        }
	                    }
	                }
	            } else {

	  // Otherwise, iterate through all of the keys in the object.

	                for (k in value) {
	                    if (Object.prototype.hasOwnProperty.call(value, k)) {
	                        v = str(k, value);
	                        if (v) {
	                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
	                        }
	                    }
	                }
	            }

	  // Join all of the member texts together, separated with commas,
	  // and wrap them in braces.

	            v = partial.length === 0 ? '{}' : gap ?
	                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
	                '{' + partial.join(',') + '}';
	            gap = mind;
	            return v;
	        }
	    }

	  // If the JSON object does not yet have a stringify method, give it one.

	    JSON.stringify = function (value, replacer, space) {

	  // The stringify method takes a value and an optional replacer, and an optional
	  // space parameter, and returns a JSON text. The replacer can be a function
	  // that can replace values, or an array of strings that will select the keys.
	  // A default replacer method can be provided. Use of the space parameter can
	  // produce text that is more easily readable.

	        var i;
	        gap = '';
	        indent = '';

	  // If the space parameter is a number, make an indent string containing that
	  // many spaces.

	        if (typeof space === 'number') {
	            for (i = 0; i < space; i += 1) {
	                indent += ' ';
	            }

	  // If the space parameter is a string, it will be used as the indent string.

	        } else if (typeof space === 'string') {
	            indent = space;
	        }

	  // If there is a replacer, it must be a function or an array.
	  // Otherwise, throw an error.

	        rep = replacer;
	        if (replacer && typeof replacer !== 'function' &&
	                (typeof replacer !== 'object' ||
	                typeof replacer.length !== 'number')) {
	            throw new Error('JSON.stringify');
	        }

	  // Make a fake root object containing our value under the key of ''.
	  // Return the result of stringifying the value.

	        return str('', {'': value});
	    };

	  // If the JSON object does not yet have a parse method, give it one.

	    JSON.parse = function (text, reviver) {
	    // The parse method takes a text and an optional reviver function, and returns
	    // a JavaScript value if the text is a valid JSON text.

	        var j;

	        function walk(holder, key) {

	    // The walk method is used to recursively walk the resulting structure so
	    // that modifications can be made.

	            var k, v, value = holder[key];
	            if (value && typeof value === 'object') {
	                for (k in value) {
	                    if (Object.prototype.hasOwnProperty.call(value, k)) {
	                        v = walk(value, k);
	                        if (v !== undefined) {
	                            value[k] = v;
	                        } else {
	                            delete value[k];
	                        }
	                    }
	                }
	            }
	            return reviver.call(holder, key, value);
	        }


	    // Parsing happens in four stages. In the first stage, we replace certain
	    // Unicode characters with escape sequences. JavaScript handles many characters
	    // incorrectly, either silently deleting them, or treating them as line endings.

	        text = String(text);
	        cx.lastIndex = 0;
	        if (cx.test(text)) {
	            text = text.replace(cx, function (a) {
	                return '\\u' +
	                    ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
	            });
	        }

	    // In the second stage, we run the text against regular expressions that look
	    // for non-JSON patterns. We are especially concerned with '()' and 'new'
	    // because they can cause invocation, and '=' because it can cause mutation.
	    // But just to be safe, we want to reject all unexpected forms.

	    // We split the second stage into 4 regexp operations in order to work around
	    // crippling inefficiencies in IE's and Safari's regexp engines. First we
	    // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
	    // replace all simple value tokens with ']' characters. Third, we delete all
	    // open brackets that follow a colon or comma or that begin the text. Finally,
	    // we look to see that the remaining characters are only whitespace or ']' or
	    // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

	        if (/^[\],:{}\s]*$/
	                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
	                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
	                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

	    // In the third stage we use the eval function to compile the text into a
	    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
	    // in JavaScript: it can begin a block or an object literal. We wrap the text
	    // in parens to eliminate the ambiguity.

	            j = eval('(' + text + ')');

	    // In the optional fourth stage, we recursively walk the new structure, passing
	    // each name/value pair to a reviver function for possible transformation.

	            return typeof reviver === 'function' ?
	                walk({'': j}, '') : j;
	        }

	    // If the text is not JSON parseable, then a SyntaxError is thrown.

	        throw new SyntaxError('JSON.parse');
	    };

	    return JSON;
	  })();

	  if ('undefined' != typeof window) {
	    window.expect = module.exports;
	  }

	})(
	    this
	  ,  true ? module : {exports: {}}
	);
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9)(module), __webpack_require__(10).Buffer))

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(11)
	var ieee754 = __webpack_require__(12)
	var isArray = __webpack_require__(13)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	/*
	 * Export kMaxLength after typed array support is determined.
	 */
	exports.kMaxLength = kMaxLength()

	function typedArraySupport () {
	  try {
	    var arr = new Uint8Array(1)
	    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
	    return arr.foo() === 42 && // typed array instances can be augmented
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	function createBuffer (that, length) {
	  if (kMaxLength() < length) {
	    throw new RangeError('Invalid typed array length')
	  }
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = new Uint8Array(length)
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    if (that === null) {
	      that = new Buffer(length)
	    }
	    that.length = length
	  }

	  return that
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
	    return new Buffer(arg, encodingOrOffset, length)
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new Error(
	        'If encoding is specified then the first argument must be a string'
	      )
	    }
	    return allocUnsafe(this, arg)
	  }
	  return from(this, arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192 // not used by this implementation

	// TODO: Legacy, not needed anymore. Remove in next major version.
	Buffer._augment = function (arr) {
	  arr.__proto__ = Buffer.prototype
	  return arr
	}

	function from (that, value, encodingOrOffset, length) {
	  if (typeof value === 'number') {
	    throw new TypeError('"value" argument must not be a number')
	  }

	  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
	    return fromArrayBuffer(that, value, encodingOrOffset, length)
	  }

	  if (typeof value === 'string') {
	    return fromString(that, value, encodingOrOffset)
	  }

	  return fromObject(that, value)
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(null, value, encodingOrOffset, length)
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	  if (typeof Symbol !== 'undefined' && Symbol.species &&
	      Buffer[Symbol.species] === Buffer) {
	    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
	    Object.defineProperty(Buffer, Symbol.species, {
	      value: null,
	      configurable: true
	    })
	  }
	}

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be a number')
	  } else if (size < 0) {
	    throw new RangeError('"size" argument must not be negative')
	  }
	}

	function alloc (that, size, fill, encoding) {
	  assertSize(size)
	  if (size <= 0) {
	    return createBuffer(that, size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpretted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(that, size).fill(fill, encoding)
	      : createBuffer(that, size).fill(fill)
	  }
	  return createBuffer(that, size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(null, size, fill, encoding)
	}

	function allocUnsafe (that, size) {
	  assertSize(size)
	  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < size; ++i) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(null, size)
	}
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(null, size)
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8'
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('"encoding" must be a valid string encoding')
	  }

	  var length = byteLength(string, encoding) | 0
	  that = createBuffer(that, length)

	  var actual = that.write(string, encoding)

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    that = that.slice(0, actual)
	  }

	  return that
	}

	function fromArrayLike (that, array) {
	  var length = array.length < 0 ? 0 : checked(array.length) | 0
	  that = createBuffer(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array, byteOffset, length) {
	  array.byteLength // this throws if `array` is not a valid ArrayBuffer

	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('\'offset\' is out of bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('\'length\' is out of bounds')
	  }

	  if (byteOffset === undefined && length === undefined) {
	    array = new Uint8Array(array)
	  } else if (length === undefined) {
	    array = new Uint8Array(array, byteOffset)
	  } else {
	    array = new Uint8Array(array, byteOffset, length)
	  }

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = array
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromArrayLike(that, array)
	  }
	  return that
	}

	function fromObject (that, obj) {
	  if (Buffer.isBuffer(obj)) {
	    var len = checked(obj.length) | 0
	    that = createBuffer(that, len)

	    if (that.length === 0) {
	      return that
	    }

	    obj.copy(that, 0, 0, len)
	    return that
	  }

	  if (obj) {
	    if ((typeof ArrayBuffer !== 'undefined' &&
	        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
	      if (typeof obj.length !== 'number' || isnan(obj.length)) {
	        return createBuffer(that, 0)
	      }
	      return fromArrayLike(that, obj)
	    }

	    if (obj.type === 'Buffer' && isArray(obj.data)) {
	      return fromArrayLike(that, obj.data)
	    }
	  }

	  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength()` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i]
	      y = b[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length
	    }
	  }

	  var buffer = Buffer.allocUnsafe(length)
	  var pos = 0
	  for (i = 0; i < list.length; ++i) {
	    var buf = list[i]
	    if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    }
	    buf.copy(buffer, pos)
	    pos += buf.length
	  }
	  return buffer
	}

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
	      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    string = '' + string
	  }

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	      case undefined:
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0
	  start >>>= 0

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8'

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
	// Buffer instances.
	Buffer.prototype._isBuffer = true

	function swap (b, n, m) {
	  var i = b[n]
	  b[n] = b[m]
	  b[m] = i
	}

	Buffer.prototype.swap16 = function swap16 () {
	  var len = this.length
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (var i = 0; i < len; i += 2) {
	    swap(this, i, i + 1)
	  }
	  return this
	}

	Buffer.prototype.swap32 = function swap32 () {
	  var len = this.length
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (var i = 0; i < len; i += 4) {
	    swap(this, i, i + 3)
	    swap(this, i + 1, i + 2)
	  }
	  return this
	}

	Buffer.prototype.swap64 = function swap64 () {
	  var len = this.length
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (var i = 0; i < len; i += 8) {
	    swap(this, i, i + 7)
	    swap(this, i + 1, i + 6)
	    swap(this, i + 2, i + 5)
	    swap(this, i + 3, i + 4)
	  }
	  return this
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError('Argument must be a Buffer')
	  }

	  if (start === undefined) {
	    start = 0
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0
	  }
	  if (thisStart === undefined) {
	    thisStart = 0
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0
	  end >>>= 0
	  thisStart >>>= 0
	  thisEnd >>>= 0

	  if (this === target) return 0

	  var x = thisEnd - thisStart
	  var y = end - start
	  var len = Math.min(x, y)

	  var thisCopy = this.slice(thisStart, thisEnd)
	  var targetCopy = target.slice(start, end)

	  for (var i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i]
	      y = targetCopy[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset
	    byteOffset = 0
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000
	  }
	  byteOffset = +byteOffset  // Coerce to Number.
	  if (isNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1)
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding)
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF // Search for a byte value [0-255]
	    if (Buffer.TYPED_ARRAY_SUPPORT &&
	        typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  var indexSize = 1
	  var arrLength = arr.length
	  var valLength = val.length

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase()
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2
	      arrLength /= 2
	      valLength /= 2
	      byteOffset /= 2
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  var i
	  if (dir) {
	    var foundIndex = -1
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex
	        foundIndex = -1
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
	    for (i = byteOffset; i >= 0; i--) {
	      var found = true
	      for (var j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	}

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; ++i) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) return i
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function latin1Write (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'latin1':
	      case 'binary':
	        return latin1Write(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; ++i) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = this.subarray(start, end)
	    newBuf.__proto__ = Buffer.prototype
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; ++i) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; --i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; ++i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, start + len),
	      targetStart
	    )
	  }

	  return len
	}

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start
	      start = 0
	      end = this.length
	    } else if (typeof end === 'string') {
	      encoding = end
	      end = this.length
	    }
	    if (val.length === 1) {
	      var code = val.charCodeAt(0)
	      if (code < 256) {
	        val = code
	      }
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0
	  end = end === undefined ? this.length : end >>> 0

	  if (!val) val = 0

	  var i
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val
	    }
	  } else {
	    var bytes = Buffer.isBuffer(val)
	      ? val
	      : utf8ToBytes(new Buffer(val, encoding).toString())
	    var len = bytes.length
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len]
	    }
	  }

	  return this
	}

	// HELPER FUNCTIONS
	// ================

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function isnan (val) {
	  return val !== val // eslint-disable-line no-self-compare
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(10).Buffer, (function() { return this; }())))

/***/ },
/* 11 */
/***/ function(module, exports) {

	'use strict'

	exports.toByteArray = toByteArray
	exports.fromByteArray = fromByteArray

	var lookup = []
	var revLookup = []
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

	function init () {
	  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	  for (var i = 0, len = code.length; i < len; ++i) {
	    lookup[i] = code[i]
	    revLookup[code.charCodeAt(i)] = i
	  }

	  revLookup['-'.charCodeAt(0)] = 62
	  revLookup['_'.charCodeAt(0)] = 63
	}

	init()

	function toByteArray (b64) {
	  var i, j, l, tmp, placeHolders, arr
	  var len = b64.length

	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // the number of equal signs (place holders)
	  // if there are two placeholders, than the two characters before it
	  // represent one byte
	  // if there is only one, then the three characters before it represent 2 bytes
	  // this is just a cheap hack to not do indexOf twice
	  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

	  // base64 is 4/3 + up to two characters of the original data
	  arr = new Arr(len * 3 / 4 - placeHolders)

	  // if there are placeholders, only get up to the last complete 4 chars
	  l = placeHolders > 0 ? len - 4 : len

	  var L = 0

	  for (i = 0, j = 0; i < l; i += 4, j += 3) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
	    arr[L++] = (tmp >> 16) & 0xFF
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  if (placeHolders === 2) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
	    arr[L++] = tmp & 0xFF
	  } else if (placeHolders === 1) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp
	  var output = []
	  for (var i = start; i < end; i += 3) {
	    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
	    output.push(tripletToBase64(tmp))
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp
	  var len = uint8.length
	  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
	  var output = ''
	  var parts = []
	  var maxChunkLength = 16383 // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1]
	    output += lookup[tmp >> 2]
	    output += lookup[(tmp << 4) & 0x3F]
	    output += '=='
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
	    output += lookup[tmp >> 10]
	    output += lookup[(tmp >> 4) & 0x3F]
	    output += lookup[(tmp << 2) & 0x3F]
	    output += '='
	  }

	  parts.push(output)

	  return parts.join('')
	}


/***/ },
/* 12 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 13 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	
	// THX for Backbone for some testcase from https://github.com/jashkenas/backbone/blob/master/test/router.js
	// to help maze becoming robust soon.

	//    Backbone.js 1.1.2
	//    (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	//    Backbone may be freely distributed under the MIT license.
	//    For all details and documentation:
	//    http://backbonejs.org


	var _ = __webpack_require__(3);
	var browser = __webpack_require__(15);
	var Histery = __webpack_require__(16);
	var expect = __webpack_require__(8)


	// Backbone.js Trick for mock the location service
	var a = document.createElement('a');
	function loc(href){
	  return ({
	    replace: function(href) {
	      a.href = href;
	      _.extend(this, {
	        href: a.href,
	        hash: a.hash,
	        host: a.host,
	        fragment: a.fragment,
	        pathname: a.pathname,
	        search: a.search
	      }, true)
	      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
	      return this;
	    }
	  }).replace(href)
	}




	describe("Histery", function(){


	  var histery = new Histery({location: loc("http://leeluolee.github.io/")})

	  var locals = {num:0}
	  function num1(path){
	    locals[path] = 1;
	  }

	  histery.start(); 
	  it("works under basic usage ", function(){
	    histery.nav("home");

	    expect(histery.location.hash).to.equal("#/home");
	    histery.checkPath();

	  })
	  it("works under basic usage 2", function(){

	    histery.on("change", num1)
	    histery.location.replace("http://leeluolee.github.io/#/home/code");
	    histery.checkPath();
	    expect(locals["/home/code"]).to.equal(1);
	    histery.off("change", num1);
	  })
	  it("works with location replace ", function(){
	    histery.on("change", num1)
	    histery.location.replace("http://leeluolee.github.io/#/home2");
	    histery.checkPath();
	    expect(histery.location.hash).to.equal("#/home2")
	    expect(locals["/home2"]).to.equal(1);
	    histery.off("change", num1);
	  })

	  it("hashmode with prefix", function(){
	    var histery = new Histery({
	      location: loc("http://regularjs.github.io/app/histery"),
	      prefix: "!"
	    })
	    histery.on("change", num1)
	    histery.location.replace("http://leeluolee.github.io/#!/prefix");
	    histery.checkPath();
	    expect(locals["/prefix"]).to.equal(1);
	    histery.off("change", num1);
	  })

	  it("works in html5 histery mode", function(){
	    var histery = new Histery({
	      location: loc("http://regularjs.github.io/app/histery"),
	      root: "/app",
	      mode: 2
	    })

	    histery.on("change", num1)
	    histery.checkPath();
	    expect(locals["/histery"]).to.equal(1);

	    histery.location.replace("http://regularjs.github.io/app/histery/code");
	    histery.checkPath();
	    expect(locals["/histery/code"]).to.equal(1);

	    histery.off("change", num1);
	  })
	  it("with prefix", function(){
	    // @TODO some hardcode '#' need remove
	    var histery = new Histery({
	      location: loc("http://regularjs.github.io/app/histery"),
	      prefix: '!'
	    })
	    histery.location.replace("http://regularjs.github.io/app/histery/code#!/prefix");
	    histery.on("change", num1)
	    histery.checkPath();
	    expect(locals["/prefix"]).to.equal(1);
	  })
	  it("every nav, the curPath should be update", function(){
	    var histery = new Histery({
	      location: loc("http://regularjs.github.io/app/histery")
	    })
	    histery.location.replace("http://regularjs.github.io/app/histery/code#/prefix");
	    histery.checkPath();

	    expect(histery.curPath).to.equal("/prefix")
	    histery.location.replace("http://regularjs.github.io/app/histery/code");
	    histery.checkPath();
	    expect(histery.curPath).to.equal("")
	  })

	})




/***/ },
/* 15 */
/***/ function(module, exports) {

	
	var win = window, 
	  doc = document;

	var b = module.exports = {
	  hash: "onhashchange" in win && (!doc.documentMode || doc.documentMode > 7),
	  history: win.history && "onpopstate" in win,
	  location: win.location,
	  isSameDomain: function(url){
		  var matched = url.match(/^.*?:\/\/([^/]*)/);
		  if(matched){
			  return matched[0] == this.location.origin;
		  }
		  return true;
	  },
	  getHref: function(node){
	    return "href" in node ? node.getAttribute("href", 2) : node.getAttribute("href");
	  },
	  on: "addEventListener" in win ?  // IE10 attachEvent is not working when binding the onpopstate, so we need check addEventLister first
	      function(node,type,cb){return node.addEventListener( type, cb )}
	    : function(node,type,cb){return node.attachEvent( "on" + type, cb )},
	    
	  off: "removeEventListener" in win ? 
	      function(node,type,cb){return node.removeEventListener( type, cb )}
	    : function(node,type,cb){return node.detachEvent( "on" + type, cb )}
	}



/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	
	// MIT
	// Thx Backbone.js 1.1.2  and https://github.com/cowboy/jquery-hashchange/blob/master/jquery.ba-hashchange.js
	// for iframe patches in old ie.

	var browser = __webpack_require__(15);
	var _ = __webpack_require__(3);


	// the mode const
	var QUIRK = 3,
	  HASH = 1,
	  HISTORY = 2;



	// extract History for test
	// resolve the conficlt with the Native History
	function Histery(options){
	  options = options || {};

	  // Trick from backbone.history for anchor-faked testcase 
	  this.location = options.location || browser.location;

	  // mode config, you can pass absolute mode (just for test);
	  this.html5 = options.html5;
	  this.mode = options.html5 && browser.history ? HISTORY: HASH; 
	  if( !browser.hash ) this.mode = QUIRK;
	  if(options.mode) this.mode = options.mode;

	  // hash prefix , used for hash or quirk mode
	  this.prefix = "#" + (options.prefix || "") ;
	  this.rPrefix = new RegExp(this.prefix + '(.*)$');
	  this.interval = options.interval || 66;

	  // the root regexp for remove the root for the path. used in History mode
	  this.root = options.root ||  "/" ;
	  this.rRoot = new RegExp("^" +  this.root);

	  this._fixInitState();

	  this.autolink = options.autolink!==false;

	  this.curPath = undefined;
	}

	_.extend( _.emitable(Histery), {
	  // check the 
	  start: function(){
	    var path = this.getPath();
	    this._checkPath = _.bind(this.checkPath, this);

	    if( this.isStart ) return;
	    this.isStart = true;

	    if(this.mode === QUIRK){
	      this._fixHashProbelm(path); 
	    }

	    switch ( this.mode ){
	      case HASH: 
	        browser.on(window, "hashchange", this._checkPath); 
	        break;
	      case HISTORY:
	        browser.on(window, "popstate", this._checkPath);
	        break;
	      case QUIRK:
	        this._checkLoop();
	    }
	    // event delegate
	    this.autolink && this._autolink();

	    this.curPath = path;

	    this.emit("change", path);
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
	  checkPath: function(ev){

	    var path = this.getPath(), curPath = this.curPath;

	    //for oldIE hash history issue
	    if(path === curPath && this.iframe){
	      path = this.getPath(this.iframe.location);
	    }

	    if( path !== curPath ) {
	      this.iframe && this.nav(path, {silent: true});
	      this.curPath = path;
	      this.emit('change', path);
	    }
	  },
	  // get the current path
	  getPath: function(location){
	    var location = location || this.location, tmp;
	    if( this.mode !== HISTORY ){
	      tmp = location.href.match(this.rPrefix);
	      return tmp && tmp[1]? tmp[1]: "";

	    }else{
	      return _.cleanPath(( location.pathname + location.search || "" ).replace( this.rRoot, "/" ))
	    }
	  },

	  nav: function(to, options ){

	    var iframe = this.iframe;

	    options = options || {};

	    to = _.cleanPath(to);

	    if(this.curPath == to) return;

	    // pushState wont trigger the checkPath
	    // but hashchange will
	    // so we need set curPath before to forbit the CheckPath
	    this.curPath = to;

	    // 3 or 1 is matched
	    if( this.mode !== HISTORY ){
	      this._setHash(this.location, to, options.replace)
	      if( iframe && this.getPath(iframe.location) !== to ){
	        if(!options.replace) iframe.document.open().close();
	        this._setHash(this.iframe.location, to, options.replace)
	      }
	    }else{
	      history[options.replace? 'replaceState': 'pushState']( {}, options.title || "" , _.cleanPath( this.root + to ) )
	    }

	    if( !options.silent ) this.emit('change', to);
	  },
	  _autolink: function(){
	    if(this.mode!==HISTORY) return;
	    // only in html5 mode, the autolink is works
	    // if(this.mode !== 2) return;
	    var prefix = this.prefix, self = this;
	    browser.on( document.body, "click", function(ev){

	      var target = ev.target || ev.srcElement;
	      if( target.tagName.toLowerCase() !== "a" ) return;
	      var tmp = browser.isSameDomain(target.href)&&(browser.getHref(target)||"").match(self.rPrefix);
		  
	      var hash = tmp && tmp[1]? tmp[1]: "";

	      if(!hash) return;
	      
	      ev.preventDefault && ev.preventDefault();
	      self.nav( hash )
	      return (ev.returnValue = false);
	    } )
	  },
	  _setHash: function(location, path, replace){
	    var href = location.href.replace(/(javascript:|#).*$/, '');
	    if (replace){
	      location.replace(href + this.prefix+ path);
	    }
	    else location.hash = this.prefix+ path;
	  },
	  // for browser that not support onhashchange
	  _checkLoop: function(){
	    var self = this; 
	    this.tid = setTimeout( function(){
	      self._checkPath();
	      self._checkLoop();
	    }, this.interval );
	  },
	  // if we use real url in hash env( browser no history popstate support)
	  // or we use hash in html5supoort mode (when paste url in other url)
	  // then , histery should repara it
	  _fixInitState: function(){
	    var pathname = _.cleanPath(this.location.pathname), hash, hashInPathName;

	    // dont support history popstate but config the html5 mode
	    if( this.mode !== HISTORY && this.html5){

	      hashInPathName = pathname.replace(this.rRoot, "")
	      if(hashInPathName) this.location.replace(this.root + this.prefix + hashInPathName);

	    }else if( this.mode === HISTORY /* && pathname === this.root*/){

	      hash = this.location.hash.replace(this.prefix, "");
	      if(hash) history.replaceState({}, document.title, _.cleanPath(this.root + hash))

	    }
	  },
	  // Thanks for backbone.history and https://github.com/cowboy/jquery-hashchange/blob/master/jquery.ba-hashchange.js
	  // for helping stateman fixing the oldie hash history issues when with iframe hack
	  _fixHashProbelm: function(path){
	    var iframe = document.createElement('iframe'), body = document.body;
	    iframe.src = 'javascript:;';
	    iframe.style.display = 'none';
	    iframe.tabIndex = -1;
	    iframe.title = "";
	    this.iframe = body.insertBefore(iframe, body.firstChild).contentWindow;
	    this.iframe.document.open().close();
	    this.iframe.location.hash = '#' + path;
	  }
	  
	})





	module.exports = Histery;


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	
	// THX for Backbone for some testcase from https://github.com/jashkenas/backbone/blob/master/test/router.js
	// to help stateman becoming robust soon.

	//    Backbone.js 1.1.2
	//    (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	//    Backbone may be freely distributed under the MIT license.
	//    For all details and documentation:
	//    http://backbonejs.org

	var StateMan = __webpack_require__(18);
	var expect = __webpack_require__(8)
	var _ = __webpack_require__(3);
	var doc = typeof document !== "undefined"? document: {};


	// Backbone.js Trick for mock the location service
	var a = document.createElement('a');
	function loc(href){
	  return ({
	    replace: function(href) {
	      a.href = href;
	      _.extend(this, {
	        href: a.href,
	        hash: a.hash,
	        host: a.host,
	        fragment: a.fragment,
	        pathname: a.pathname,
	        search: a.search
	      }, true)
	      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
	      return this;
	    }
	  }).replace(href)
	}


	function reset(stateman){
	  stateman._states = {};
	  stateman.off();
	}

	describe("stateman", function(){

	describe("Util", function(){
	  it("util.eql", function( ){
	    expect(_.eql({a:1}, [2,1])).to.be.equal(false);
	    expect(_.eql({a:1, b:3}, {a:1})).to.be.equal(false);
	    expect(_.eql({a:1, b:3}, {a:1, b:3})).to.be.equal(true);
	    expect(_.eql(1, 1)).to.be.equal(true);
	  })
	  it("util.emitable:basic", function(){
	    var emitter = _.emitable({}); 
	    var obj = {basic1:0,basic2:0,basic3:0};

	    emitter.on('basic1', function(){
	      obj.basic1++
	    })
	    emitter.on('basic2', function(){
	      obj.basic2++
	    })
	    emitter.on('basic3', function(){
	      obj.basic3++
	    })
	    emitter.emit('basic1');
	    expect(obj.basic1).to.equal(1);
	    emitter.off('basic1')
	    emitter.emit('basic1');
	    expect(obj.basic1).to.equal(1);
	    emitter.off()
	    emitter.emit('basic2');
	    emitter.emit('basic3');
	    expect(obj.basic2).to.equal(0);
	    expect(obj.basic2).to.equal(0);

	  })
	  it("util.emitable:namespace", function(){
	    var emitter = _.emitable({}); 
	    obj = {enter_app: 0, enter_blog: 0}

	    emitter.on('enter:app', function(){
	      obj.enter_app++
	    })
	    emitter.on('enter:blog', function(){
	      obj.enter_blog++
	    })
	    emitter.off('enter:app')
	    emitter.emit('enter');
	    expect(obj.enter_blog).to.equal(1)
	    expect(obj.enter_app).to.equal(0)
	    emitter.emit('enter:blog')
	    expect(obj.enter_blog).to.equal(2)
	    emitter.off('enter');
	    emitter.emit('enter');
	    expect(obj.enter_blog).to.equal(2)
	  })
	})

	describe("stateman:basic", function(){
	  var stateman = StateMan( {} );
	  var location = loc("http://leeluolee.github.io/homepage");


	  var obj = {}; 

	  stateman
	    .state('l0_not_next', function(){
	      obj.l0 = true
	    })
	    .state('l1_has_next', {
	      enter: function(){obj.l1 = true},
	      leave: function(){obj.l1 = false}
	    })
	    .state('l1_has_next.l11_has_next', {
	      enter: function(){obj.l12 = true},
	      leave: function(){obj.l12 = false}
	    })
	    .state('l1_has_next.l11_has_next.l12_not_next', {
	      url:'',
	      enter: function(){obj.l13 = true},
	      leave: function(){obj.l13 = false}
	    })
	    .state('book', {
	      enter: function(){obj.book = true},
	      leave: function(){obj.book = false}
	    })
	    .state('book.detail', {
	      url: "/:bid",
	      enter: function(option){obj.book_detail = option.param.bid},
	      leave: function(){obj.book_detail = false},
	      update: function(option){obj.book_detail_update = option.param.bid}
	    })
	    .state('book.detail.index', {
	      url: "",
	      enter: function(option){obj.book_detail_index = option.param.bid},
	      leave: function(){obj.book_detail_index = false}

	    })
	    .state('book.detail.message', {
	      enter: function(option){ obj.book_detail_message = option.param.bid },
	      leave: function(){obj.book_detail_message = false},
	      update: function(option){obj.book_detail_message_update = option.param.bid}
	    })
	    .state('book.list', {
	      url: "", 
	      enter: function(){obj.book_list = true},
	      leave: function(){obj.book_list = false}
	    })
	    .state('$notfound', {
	      enter: function(){
	        obj.notfound = true
	      },
	      leave: function(){
	        obj.notfound = false;
	      }
	    })
	    .start({
	      location: location
	    });

	  after(function(){
	    stateman.stop();
	  })
	  it("we can directly vist the leave1 leaf state", function(){

	    stateman.nav("/l0_not_next");
	    expect(obj.l0).to.equal(true);

	  })
	  it("some Edge test should not throw error", function(){

	    expect(function(){
	      stateman.nav("");
	      stateman.nav(undefined);
	      stateman.go();
	    }).to.not.throwError()

	  })
	 
	  it("in strict mode, we can not touched the non-leaf state",function(){
	    var location = loc("http://leeluolee.github.io/homepage");
	    var stateman = new StateMan( {strict: true} );
	    stateman.start({location: location});

	    stateman.state("app.state", {})
	    stateman.go("app");
	    expect(stateman.current.name).to.not.equal("app");
	  })

	  it("we can directly vist the branch state, but have low poririty than leaf", function(){
	    stateman.nav("/l1_has_next/l11_has_next")
	    expect(obj.l13).to.equal(true);

	  })

	  it("we can define the id in url", function(){
	    stateman.nav("/book/1");
	    expect(obj.book).to.equal(true)
	    expect(obj.book_detail).to.equal("1")
	  })
	  it("we can also assign the blank url", function(){
	    stateman.nav("/book");
	    expect(obj.book).to.equal(true)
	    expect(obj.book_detail).to.equal(false)
	    expect(obj.book_list).to.equal(true)
	  })

	  it("the ancestor should update if the path is change, but the state is not change", function(){
	    stateman.nav("/book/1");
	    expect(obj.book).to.equal(true)
	    expect(obj.book_detail_index).to.equal("1")
	    stateman.nav("/book/2/message");
	    expect(obj.book).to.equal(true)
	    expect(obj.book_detail_update).to.equal("2")
	    expect(obj.book_detail_message).to.equal("2")
	    stateman.nav("/book/3/message");
	    expect(obj.book_detail_update).to.equal("3")
	    expect(obj.book_detail_message_update).to.equal("3")
	  })
	  it("the ancestor before basestate between current and previouse should update", function(){
	    stateman.nav("/book/6/message");
	    stateman.nav("/book/4/message");
	    expect(obj.book_detail_update).to.equal("4")
	    expect(obj.book_detail_message_update).to.equal("4")
	    stateman.nav("/book/5");
	    expect(obj.book_detail_update).to.equal("5")
	    expect(obj.book_detail_message_update).to.equal("4")
	  })


	  it("we can directly define the nested state", function(){
	      stateman.state('directly.skip.parent.state', function(){
	        obj.directly_skip_parent_state = true;
	      }).nav("/directly/skip/parent/state")

	      expect(obj.directly_skip_parent_state).to.equal(true)

	  })



	})


	describe("stateman:navigation", function(){

	  var location = loc("http://leeluolee.github.io/stateman");

	  var obj = {}; 

	  var stateman = new StateMan()
	    .state("home", {})
	    .state("contact.id", {
	    })
	})


	// current previous pending and others
	describe("stateman:property", function(){
	})


	describe("stateman:transition", function(){

	  var location = loc("http://leeluolee.github.io/homepage");


	  var obj = {}; 

	  var stateman = new StateMan();
	    stateman

	    .state("home", {})
	    .state("contact", {
	      // animation basic
	      enter: function(option){
	        var done = option.async();
	        setTimeout(done, 100)
	      },

	      leave: function(option){
	        var done = option.async();
	        setTimeout(done, 100)
	      }
	    })
	    .state("contact.list", {
	      url: "",
	      // animation basic
	      enter: function(){
	      },

	      leave: function(){
	      }
	    })
	    .state("contact.detail", {
	      url: ":id",
	      // animation basic
	      enter: function(option){
	        var done = option.async();
	        setTimeout(function(){
	          obj.contact_detail = option.param.id
	          done();
	        }, 100)
	        
	      },

	      leave: function(option){
	        obj.contact_detail = option.param.id
	      }
	    })
	    .state("book", {
	      // animation basic
	      enter: function(option){
	        var done = option.async();
	        setTimeout(function(){
	          obj.book = true;
	          done()
	        }, 100)
	      },

	      leave: function(option){
	        var done = option.async();
	        setTimeout(function(){
	          obj.book = false;
	          done();
	        }, 100)
	      }
	    })
	    .state("book.id", {
	      url: ":id",
	      // animation basic
	      enter: function(option){
	        obj.book_detail = option.param.id
	      },

	      leave: function(option){
	        delete obj.book_detail;
	      }
	    })
	    .start({
	      location: location
	    })

	  after(function(){
	    stateman.stop();
	  })

	 it("we can use callback as second param", function(done){

	    stateman.state('callback.second', {})
	    stateman.nav('/callback/second', function(option){
	      expect(option.current.name ==='callback.second')
	      done();
	    })

	  })
	  it("we can use transition in enter and leave", function(done){

	    stateman.nav("/book/1" , {},function(){

	      expect(obj.book).to.equal(true)
	      expect(obj.book_detail).to.equal("1")

	      stateman.nav("/contact/2", {}, function(){

	        expect(obj.book).to.equal(false)
	        expect(obj.contact_detail).to.equal("2")
	        done();
	      });

	      expect(obj.book).to.equal(true)
	      expect(obj.contact_detail).to.equal(undefined)
	      // sync enter will directly done
	      expect(obj.book_detail).to.equal(undefined)
	    })

	    expect(obj.book).to.equal(undefined)
	    expect(obj.book_detail).to.equal(undefined)

	  })

	  it("will forbit previous async nav if next is comming", function(done){
	    stateman.nav("/book/1").nav("/home", {}, function(){
	      expect(stateman.current.name).to.equal("home")
	      done();
	    });
	  })

	  // done (false)
	  var loc2 = loc("http://leeluolee.github.io/homepage");
	  var obj2 = {}; 
	  var stateman2 = new StateMan();

	  stateman2.start({location: loc2})
	  after(function(){
	    stateman.stop();
	  })

	  it("enter return false can stop a navigation", function(){
	    stateman2.state("contact", {
	      enter: function( option ){
	        return !option.ban;
	      }
	    });
	    stateman2.state("contact.detail", {
	      leave: function(option){
	        return !option.ban
	      }
	    })

	    stateman2.go("contact.detail", {  ban:true })
	    expect( stateman2.active.name ).to.equal("contact")
	    stateman2.go("contact.detail", {  ban: false })
	    stateman2.go("contact", { ban:true});
	    expect(stateman2.current.name).to.equal("contact.detail")
	  })
	  it("pass false to done, can stop a async ", function(done){

	    stateman2.state("user", {
	      enter: function(option){
	        var done = option.async();
	        setTimeout(function(){
	          done(option.success)
	        },50)
	      }
	    });
	    stateman2.state("user.detail", {
	      leave: function(option){
	        var done = option.async();
	        setTimeout(function(){
	          done(option.success)
	        },50)
	      }
	    })
	    stateman2.state("user.message", {
	      enter: function(){
	        option.async()
	      }
	    })

	    stateman2.go("user.detail", { success:false }, function(){
	      expect(stateman2.current.name).to.equal("user")
	      stateman2.go("user.detail", { success: true }, function(){
	        expect(stateman2.current.name).to.equal("user.detail")
	        stateman2.go("user", {success: false}, function(){
	          expect(stateman2.current.name).to.equal("user.detail")
	          done()
	        });
	      })
	    })
	    
	  })

	})

	describe("stateman:redirect", function(){

	  var location = loc("http://leeluolee.github.io/homepage");
	  var obj = {}; 
	  var stateman = new StateMan();

	  stateman.start({location: location})
	  after(function(){
	    stateman.stop();
	  })


	  it("we can redirect at branch state, if it is not async", function(){
	    reset(stateman);
	    stateman
	      .state("branch1", {
	        enter: function(opt){
	          if(opt.param.id == "1"){
	            opt.stop();

	            stateman.nav("branch2")

	          }
	        },
	        leave: function(){
	          obj["branch1_leave"] = true;
	        }

	      })
	      .state("branch1.leaf", function(){
	        obj["branch1_leaf"] = true;
	      })
	      .state("branch2", function(){
	        obj.branch2 = true
	      })

	    stateman.nav("/branch1/leaf?id=1");

	    expect(stateman.current.name).to.equal("branch2");
	    expect(obj.branch1_leave).to.equal(true);
	    expect(obj.branch2).to.equal(true);
	    expect(obj.branch1_leaf).to.equal(undefined);
	  })

	  it("we can redirect at leaf state also", function(){
	    reset(stateman);

	    stateman.state("branch1.leaf", function(){

	      stateman.go("branch2.leaf")

	    }).state("branch2.leaf", function(){

	      obj.branch2_leaf = true;

	    })

	    stateman.nav("/branch1/leaf");

	    expect(stateman.current.name).to.equal("branch2.leaf");

	  })
	  it("we can redirect if the async state is done before redirect", function(done){

	    var location = loc("http://leeluolee.github.io/homepage");
	    var obj = {}; 
	    var stateman = new StateMan();

	    stateman.start({location: location})
	    done();

	    // // beacuse the last state dont need async will dont need to async forever
	    // stateman.state("branch2", function(){
	    //   var over = this.async()
	    //   setTimeout(function(){
	    //     over();
	    //     stateman.go("branch3.leaf", null, function(){
	    //       expect(this.current.name).to.equal("branch3.leaf");
	    //       expect(obj.branch2_leaf).to.equal(true)
	    //       expect(obj.branch3_leaf).to.equal(true)
	    //       done()
	    //     })
	    //   },100)
	    // })
	    // .state("branch2.leaf", function(){
	    //   obj.branch2_leaf = true
	    // })
	    // .state("branch3.leaf", function(){
	    //   obj.branch3_leaf = true;
	    // })

	    // stateman.nav("/branch2/leaf")

	  })

	})

	describe("stateman:other", function(){
	  var location = loc("http://leeluolee.github.io/homepage");
	  var obj = {}; 
	  var stateman = new StateMan();

	  stateman
	    .start({location: location})
	    .state("contact.detail", {
	      events: {
	        notify: function(option){
	          obj.contact_detail = true;
	        }
	      },
	      enter: function(){
	        obj.manager = this.manager;
	      }
	    })

	  after(function(){
	    stateman.stop();
	  })


	  it("visited flag will add if the state is entered", function(){
	    expect(stateman.state("contact.detail").visited).to.equal(false)
	    stateman.go("contact.detail")
	    expect(stateman.state("contact.detail").visited).to.equal(true)
	    expect(obj.manager).to.equal(stateman)
	  })


	  it("stateman.decode should return the parsed state", function(){

	    var state = stateman.state("book.detail", {url: ":id"}).decode("/book/a?name=12")
	    expect(state.param).to.eql({id:"a", name: "12"})
	  })

	  it("stateman.go should also assign the stateman.path", function(){

	    var state = stateman.state("book.message", {}).go("book.message")
	    expect(state.path).to.eql("/book/message")
	  })

	  it("stateman.encode should return the url", function(){

	    expect(stateman.encode("contact.detail")).to.equal("/contact/detail")
	    var state = stateman.state("encode.detail", {url: ':id'}).go("book.message")
	    expect(stateman.encode("encode.detail", {id:1, name:2})).to.equal("/encode/1?name=2")

	  })

	})


	describe("stateman: matches and relative go", function(){
	  var location = loc("http://leeluolee.github.io/homepage");
	  var obj = {}; 

	  var stateman = new StateMan();
	    stateman.state("contact.detail.message", {})
	    .state("contact.list", {
	      enter: function(){
	        stateman.go("^.detail.message");
	        expect(stateman.current.name).to.equal('contact.detail.message');
	      }
	    })
	    .state("contact.list.option", {})
	    .state("contact.user.param", {url: ":id"})
	    .start({location: location});

	  after(function(){
	    stateman.stop();
	  })

	  it("relative to parent(^) should work as expect", function(){
	    stateman.go("contact.detail.message");
	    expect(stateman.current.name).to.equal("contact.detail.message");
	    stateman.go("^");
	    expect(stateman.current.name).to.equal("contact.detail");
	    stateman.go("^.list.option");
	  })  
	  it("relative to parent(~) should work as expect", function(){
	    stateman.go("contact.detail");
	    expect(stateman.current.name).to.equal("contact.detail");
	    stateman.go("~.message");
	    expect(stateman.current.name).to.equal("contact.detail.message");
	  })

	  it("stateman.is should work as expect", function(){
	    stateman.go("contact.detail.message");
	    expect( stateman.is("contact.detail", {})).to.equal(true);
	    expect( stateman.is("contact.detail", {}, true)).to.equal(false);
	    expect( stateman.is("detail.message", {})).to.equal(false);
	    expect( stateman.is("contact.detail.message", {})).to.equal(true);
	    stateman.nav("/contact/user/1");

	    expect( stateman.is("contact.user.param")).to.equal(true);
	    expect( stateman.is("contact.user.param", {})).to.equal(true);
	    expect( stateman.is("contact.user", {id: "1"})).to.equal(true);
	    expect( stateman.is("contact.user", {id: "2"})).to.equal(false);
	    expect( stateman.is()).to.equal(false);

	    stateman.state("contactmanage.detail",{})

	    stateman.go("contactmanage.detail");
	    expect(stateman.is("contact")).to.equal(false)
	  })

	})

	describe("LifeCycle: callForPermission", function(){

	    var location = loc("http://leeluolee.github.io/homepage");
	    var obj = {}; 
	    var stateman = StateMan();
	      stateman.state({
	        "normal": { },
	        "normal.blog": {
	          canEnter: function(){
	            return false 
	          },
	          enter: function(){
	            obj['normal.blog']  = true 
	          }
	        },
	        'normal.user': {
	          canLeave: function(){
	            return false
	          },
	          canEnter: function(){

	          },
	          enter: function(){
	            obj['normal.chat'] = true
	          }
	        },
	        'normal.chat': {
	          enter: function(){
	            obj['normal.chat'] = true
	          }
	        }
	      })
	      .start({location: location});
	  it("return false in canEnter or canLeave, will stop navigation", function( ){
	    stateman.go('normal.chat')
	    expect(stateman.current.name).to.equal('normal.chat')
	    stateman.go('normal.blog')
	    expect(stateman.current.name).to.equal('normal.chat')
	    stateman.go('normal.user')
	    expect(stateman.current.name).to.equal('normal.user')
	    expect(stateman.active.name).to.equal('normal.user')
	    expect(stateman.previous.name).to.equal('normal.chat')
	    stateman.go('normal.chat')
	    expect(stateman.current.name).to.equal('normal.user')
	    expect(stateman.active.name).to.equal('normal.user')
	    expect(stateman.previous.name).to.equal('normal.chat')
	    
	  })
	  if(typeof Promise !== 'undefined'){
	    var obj = {}; 
	    var pstateman = StateMan();

	    pstateman.state({
	      "promise": { },
	      "promise.blog": {
	        canEnter: function(){
	          return Promise.reject()
	        },
	        enter: function(){
	          pstateman['promise.blog']  = true 
	        }
	      },
	      'promise.user': {
	        canLeave: function(){
	          return new Promise(function(resolve, reject){
	            setTimeout(reject, 300)
	          })
	        }
	      },
	      'promise.chat': {
	        enter: function(){
	          return new Promise(function(resolve, reject){
	            setTimeout(function(){
	              pstateman['promise.chat'] = true;
	              resolve();
	            }, 300)
	          })
	        },
	        leave: function(){
	          return new Promise(function(resolve, reject){
	            setTimeout(function(){
	              pstateman['promise.chat'] = false;
	              resolve();
	            }, 300)
	          })
	        }
	      }
	    }).start({'location':loc("http://leeluolee.github.io/homepage")} )
	    it("canEnter and canLeave accpet [Promise] as return value", function( done ){
	      pstateman.go('promise.chat', function(option){
	        expect(option.phase).to.equal('completion')
	        expect(pstateman['promise.chat']).to.equal(true)
	        pstateman.go('promise.blog', function(option){
	          expect(option.phase).to.equal('permission')
	          expect(pstateman['promise.blog']).to.equal(undefined)
	          pstateman.go('promise.user', function(option){
	            expect(option.phase).to.equal('completion')
	            expect(pstateman.current.name).to.equal('promise.user')
	            expect(pstateman.active.name).to.equal('promise.user')
	            expect(pstateman.previous.name).to.equal('promise.chat')
	            pstateman.nav('/promise/chat', function(option){
	              expect(option.phase).to.equal('permission')
	              expect(pstateman.current.name).to.equal('promise.user')
	              expect(pstateman.active.name).to.equal('promise.user')
	              expect(pstateman.previous.name).to.equal('promise.chat')
	              done()
	            })

	          })
	        })
	        expect(pstateman['promise.blog']).to.equal(undefined)
	      })
	      expect(pstateman['promise.chat']).to.equal(undefined)
	    })
	    it("if you resolve promise with `false`, it is same as reject", function(){

	    })
	  }

	})

	describe("LifeCycle: Navigating", function(){
	  var location = loc("http://leeluolee.github.io/");
	  var obj = {}; 
	  var stateman = new StateMan();

	  stateman
	    .state("app", {
	      enter: function(){
	      }
	    })
	    .start({location: location})


	  after(function(){
	    stateman.stop();
	  })


	  it("redirect at root, should stop navigating and redirect to new current", function(){
	    var index =0, blog=0;
	    stateman.state("app.index", {
	      enter:function(){
	        index++
	      }
	    })
	    .state("app.blog", {enter: function(){
	      blog++;
	    }})
	    .on("begin", function( option ){
	      if(option.current.name !== "app.index"){
	        option.stop(); // @TODO tongyi 
	        stateman.go("app.index")
	      }
	    })


	    var end = 0;
	    stateman.on("end", function(){
	      end++;
	    })
	    stateman.nav("/app/blog", {} );
	    expect( blog ).to.equal( 0 );
	    expect( index ).to.equal( 1 );
	    expect( end ).to.equal( 1 );

	    stateman.nav("/app/blog", {} );
	    expect( end ).to.equal( 2 );
	    expect( blog ).to.equal( 0 );
	    stateman.off();
	    stateman._states = {}
	  })

	  it("redirect at root, during redirect the callback should stashed, when end all callbacks should emit ", function(done){
	    stateman
	      .state( "app1.index", {
	        enter:function(){
	          stateman.go("app1.blog", function(){
	            expect(stateman.active.name === "app1.blog").to.equal(true);
	            expect(stateman._stashCallback.length).to.equal(0);
	            done();
	          })
	        }
	      })
	      .state( "app1.blog", {enter: function(){}})

	    stateman.go("app1.index")
	  })

	  it("option passed to nav, should also passed in enter, update and leave", function(done){
	    var data = {id:1}, num =0;
	    stateman.state("app2.index", {
	      url: "index/:id",
	      enter: function(option){
	        expect(option.data).to.equal(data);
	        expect(option.data).to.equal(data);
	        expect(option.param.id).to.equal("2");
	        done();
	      }
	    })
	    stateman.nav("/app2/index/2", {data: data})

	  })

	  it("stateman.back should return the previous state", function(){

	  })


	})

	describe("Config", function(){
	  var location = loc("http://leeluolee.github.io/");
	  var obj = {}; 
	  var stateman = new StateMan();
	  stateman.start({location: location})

	  after(function(){
	    stateman.stop();
	  })

	  it("title should accept String", function(){
	    var baseTitle = doc.title;
	    stateman.state({
	      "app.hello": {
	        title: "hello app"
	      },
	      "app.exam": {
	        url: "exam/:id",
	        title: function(){
	          return "hello " + this.name + " " + stateman.param.id;
	        }
	      },
	      "app.third": {}
	    })
	    stateman.go("app.hello")
	    expect(doc.title).to.equal("hello app")
	    stateman.go("app.exam", {param: {id: 1}})
	    expect(doc.title).to.equal("hello app.exam 1")
	    stateman.nav("/app/third");
	    expect(doc.title).to.equal(baseTitle);
	  })

	  it("title should Recursive up search", function(){
	    var baseTitle = doc.title;
	    stateman.state({
	      "app2": {
	        title: "APP"
	      },
	      "app2.third": {}
	    })
	    stateman.go("app2.third")

	    expect(doc.title).to.equal("APP")
	  })
	})
	})


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var State = __webpack_require__(2),
	    Histery = __webpack_require__(16),
	    brow = __webpack_require__(15),
	    _ = __webpack_require__(3),
	    baseTitle = document.title,
	    stateFn = State.prototype.state;

	function StateMan(options)
	{
	    if (this instanceof StateMan === false)
	    {
	        return new StateMan(options)
	    }
	    options = options || {};
	    // if(options.history) this.history = options.history;

	    this._states = {};
	    this._stashCallback = [];
	    this.strict = options.strict;
	    this.current = this.active = this;
	    this.title = options.title;
	    this.on("end", function ()
	    {
	        var cur = this.current, title;
	        while (cur)
	        {
	            title = cur.title;
	            if (title) break;
	            cur = cur.parent;
	        }
	        document.title = typeof title === "function" ? cur.title() : String(title || baseTitle);
	    })
	}

	_.extend(_.emitable(StateMan), {
	    // keep blank
	    name: '',

	    state: function (stateName, config)
	    {

	        var active = this.active;
	        if (typeof stateName === "string" && active)
	        {
	            stateName = stateName.replace("~", active.name)
	            if (active.parent) stateName = stateName.replace("^", active.parent.name || "");
	        }
	        // ^ represent current.parent
	        // ~ represent  current
	        // only
	        return stateFn.apply(this, arguments);

	    },
	    start: function (options)
	    {

	        if (!this.history) this.history = new Histery(options);
	        if (!this.history.isStart)
	        {
	            this.history.on("change", _.bind(this._afterPathChange, this));
	            this.history.start();
	        }
	        return this;

	    },
	    stop: function ()
	    {
	        this.history.stop();
	    },
	    // @TODO direct go the point state
	    go: function (state, option, callback)
	    {
	        option = option || {};
	        var statename;
	        if (typeof state === "string")
	        {
	            statename = state;
	            state = this.state(state);
	        }

	        if (!state) return this._notfound({state: statename});

	        if (typeof option === "function")
	        {
	            callback = option;
	            option = {};
	        }

	        if (option.encode !== false)
	        {
	            var url = state.encode(option.param)
	            option.path = url;
	            this.nav(url, {silent: true, replace: option.replace});
	        }

	        this._go(state, option, callback);

	        return this;
	    },
	    nav: function (url, options, callback)
	    {
	        if (typeof options === "function")
	        {
	            callback = options;
	            options = {};
	        }
	        options = options || {};

	        options.path = url;

	        this.history.nav(url, _.extend({silent: true}, options));
	        if (!options.silent) this._afterPathChange(_.cleanPath(url), options, callback)

	        return this;
	    },
	    decode: function (path)
	    {

	        var pathAndQuery = path.split("?");
	        var query = this._findQuery(pathAndQuery[1]);
	        path = pathAndQuery[0];
	        var state = this._findState(this, path);
	        if (state) _.extend(state.param, query);
	        return state;

	    },
	    encode: function (stateName, param)
	    {
	        var state = this.state(stateName);
	        return state ? state.encode(param) : '';
	    },
	    // notify specify state
	    // check the active statename whether to match the passed condition (stateName and param)
	    is: function (stateName, param, isStrict)
	    {
	        if (!stateName) return false;
	        var stateName = (stateName.name || stateName);
	        var current = this.current, currentName = current.name;
	        var matchPath = isStrict ? currentName === stateName : (currentName + ".").indexOf(stateName + ".") === 0;
	        return matchPath && (!param || _.eql(param, this.param));
	    },
	    // after pathchange changed
	    // @TODO: afterPathChange need based on decode
	    _afterPathChange: function (path, options, callback)
	    {

	        this.emit("history:change", path);

	        var found = this.decode(path);

	        options = options || {};

	        options.path = path;

	        if (!found)
	        {
	            // loc.nav("$default", {silent: true})
	            return this._notfound(options);
	        }

	        options.param = found.param;

	        this._go(found, options, callback);
	    },
	    _notfound: function (options)
	    {

	        // var $notfound = this.state("$notfound");

	        // if( $notfound ) this._go($notfound, options);

	        return this.emit("notfound", options);
	    },
	    // goto the state with some option
	    _go: function (state, option, callback)
	    {

	        var over;

	        // if(typeof state === "string") state = this.state(state);

	        // if(!state) return _.log("destination is not defined")

	        if (state.hasNext && this.strict) return this._notfound({name: state.name});

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


	        if (typeof callback === "function") this._stashCallback.push(callback);
	        // if we done the navigating when start
	        function done(success)
	        {
	            over = true;
	            if (success !== false) self.emit("end");
	            self.pending = null;
	            self._popStash(option);
	        }

	        option.previous = current;
	        option.current = state;

	        if (current !== state)
	        {
	            option.stop = function ()
	            {
	                done(false);
	                self.nav(prepath ? prepath : "/", {silent: true});
	            }
	            self.emit("begin", option);

	        }
	        // if we stop it in 'begin' listener
	        if (over === true) return;

	        if (current !== state)
	        {
	            // option as transition object.

	            option.phase = 'permission';
	            this._walk(current, state, option, true, _.bind(function (notRejected)
	            {

	                if (notRejected === false)
	                {
	                    // if reject in callForPermission, we will return to old
	                    prepath && this.nav(prepath, {silent: true})

	                    done(false, 2)

	                    return this.emit('abort', option);

	                }

	                // stop previous pending.
	                if (this.pending) this.pending.stop()
	                this.pending = option;
	                this.path = option.path;
	                this.current = option.current;
	                this.param = option.param;
	                this.previous = option.previous;
	                option.phase = 'navigation';
	                this._walk(current, state, option, false, _.bind(function (notRejected)
	                {

	                    if (notRejected === false)
	                    {
	                        this.current = this.active;
	                        done(false)
	                        return this.emit('abort', option);
	                    }


	                    this.active = option.current;

	                    option.phase = 'completion';
	                    return done()

	                }, this))

	            }, this))

	        } else
	        {
	            self._checkQueryAndParam(baseState, option);
	            this.pending = null;
	            done();
	        }

	    },
	    _popStash: function (option)
	    {

	        var stash = this._stashCallback, len = stash.length;

	        this._stashCallback = [];

	        if (!len) return;

	        for (var i = 0; i < len; i++)
	        {
	            stash[i].call(this, option)
	        }
	    },

	    // the transition logic  Used in Both canLeave canEnter && leave enter LifeCycle

	    _walk: function (from, to, option, callForPermit, callback)
	    {

	        // nothing -> app.state
	        var parent = this._findBase(from, to);


	        option.basckward = true;
	        this._transit(from, parent, option, callForPermit, _.bind(function (notRejected)
	        {

	            if (notRejected === false) return callback(notRejected);

	            // only actual transiton need update base state;
	            if (!callForPermit)  this._checkQueryAndParam(parent, option)

	            option.basckward = false;
	            this._transit(parent, to, option, callForPermit, callback)

	        }, this))

	    },

	    _transit: function (from, to, option, callForPermit, callback)
	    {
	        //  touch the ending
	        if (from === to) return callback();

	        var back = from.name.length > to.name.length;
	        var method = back ? 'leave' : 'enter';
	        var applied;

	        // use canEnter to detect permission
	        if (callForPermit) method = 'can' + method.replace(/^\w/, function (a)
	            {
	                return a.toUpperCase()
	            });

	        var loop = _.bind(function (notRejected)
	        {


	            // stop transition or touch the end
	            if (applied === to || notRejected === false) return callback(notRejected);

	            if (!applied)
	            {

	                applied = back ? from : this._computeNext(from, to);

	            } else
	            {

	                applied = this._computeNext(applied, to);
	            }

	            if ((back && applied === to) || !applied)return callback(notRejected)

	            this._moveOn(applied, method, option, loop);

	        }, this);

	        loop();
	    },

	    _moveOn: function (applied, method, option, callback)
	    {

	        var isDone = false;
	        var isPending = false;

	        option.async = function ()
	        {

	            isPending = true;

	            return done;
	        }

	        function done(notRejected)
	        {
	            if (isDone) return;
	            isPending = false;
	            isDone = true;
	            callback(notRejected);
	        }


	        option.stop = function ()
	        {
	            done(false);
	        }


	        this.active = applied;
	        var retValue = applied[method] ? applied[method](option) : true;

	        if (method === 'enter') applied.visited = true;
	        // promise
	        // need breadk , if we call option.stop first;

	        if (_.isPromise(retValue))
	        {

	            return this._wrapPromise(retValue, done);

	        }

	        // if haven't call option.async yet
	        if (!isPending) done(retValue)

	    },

	    _wrapPromise: function (promise, next)
	    {

	        return promise.then(next, function ()
	        {
	            next(false)
	        });

	    },

	    _computeNext: function (from, to)
	    {

	        var fname = from.name;
	        var tname = to.name;

	        var tsplit = tname.split('.')
	        var fsplit = fname.split('.')

	        var tlen = tsplit.length;
	        var flen = fsplit.length;

	        if (fname === '') flen = 0;
	        if (tname === '') tlen = 0;

	        if (flen < tlen)
	        {
	            fsplit[flen] = tsplit[flen];
	        } else
	        {
	            fsplit.pop();
	        }

	        return this.state(fsplit.join('.'))

	    },

	    _findQuery: function (querystr)
	    {

	        var queries = querystr && querystr.split("&"), query = {};
	        if (queries)
	        {
	            var len = queries.length;
	            var query = {};
	            for (var i = 0; i < len; i++)
	            {
	                var tmp = queries[i].split("=");
	                query[tmp[0]] = tmp[1];
	            }
	        }
	        return query;

	    },
	    _findState: function (state, path)
	    {
	        var states = state._states, found, param;

	        // leaf-state has the high priority upon branch-state
	        if (state.hasNext)
	        {
	            for (var i in states) if (states.hasOwnProperty(i))
	            {
	                found = this._findState(states[i], path);
	                if (found) return found;
	            }
	        }
	        // in strict mode only leaf can be touched
	        // if all children is don. will try it self
	        param = state.regexp && state.decode(path);
	        if (param)
	        {
	            state.param = param;
	            return state;
	        } else
	        {
	            return false;
	        }
	    },
	    // find the same branch;
	    _findBase: function (now, before)
	    {

	        if (!now || !before || now == this || before == this) return this;
	        var np = now, bp = before, tmp;
	        while (np && bp)
	        {
	            tmp = bp;
	            while (tmp)
	            {
	                if (np === tmp) return tmp;
	                tmp = tmp.parent;
	            }
	            np = np.parent;
	        }
	    },
	    // check the query and Param
	    _checkQueryAndParam: function (baseState, options)
	    {
	        var from = baseState;
	        while (from !== this)
	        {
	            from.update && from.update(options);
	            from = from.parent;
	        }
	    }
	}, true);

	module.exports = StateMan;



/***/ }
/******/ ]);