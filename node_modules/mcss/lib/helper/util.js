// namespace
var _ = {};
var slice = [].slice;
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('./path');
var tpl = require('./tpl');
var acceptError = tpl('the {i} argument passed to this function only accept {accept}, but got "{type}"');

var fp = Function.prototype,
    np = Number.prototype;

// Native extend
function returnTrue(){
    return true;
}
_.accept = function(fn, list) {
    if (!list || !list.length) return;
    var tlist = list.map(function(item) {
        if (!item) return returnTrue;
        if(typeof item === 'function') return item;
        return _.makePredicate(item);
    })
    return function(){
        var args = _.slice(arguments);
        // means invalid 
        for (var i = args.length; i--;) {
            if(!args[i]) continue;
            var type = args[i].type;
            var test = tlist[i];
            if (test && !test(type)) {
                var message = 'invalid param or operand : ' + type;
                if(this.error){
                    this.error(message, args[0].lineno);
                }else{
                    throw Error(message)
                }

            }
        }
        return fn.apply(this, arguments)
    }
}

_.msetter = function(fn){
    return function(key, value) {
        if (typeof key === 'object'){
            var args = _.slice(arguments, 1)
            for(var i in key){
                fn.apply(this, [i, key[i]].concat(args));
            }
            return this;
        }else{
            return fn.apply(this, arguments);
        }
    };  
}

// limit
// np.__limit = function(min, max){
//     return Math.min(max, Math.max(min, this));
// }


_.limit = function(num , min, max){
    return Math.min(max, Math.max(min, num));
}



// thx acorn.js http://marijnhaverbeke.nl/acorn/ 
_.makePredicate = function(words, prefix) {
    if (typeof words === 'string') {
        words = words.split(" ");
    }
    var f = "",
    cats = [];
    out: for (var i = 0; i < words.length; ++i) {
        for (var j = 0; j < cats.length; ++j)
        if (cats[j][0].length == words[i].length) {
            cats[j].push(words[i]);
            continue out;
        }
        cats.push([words[i]]);
    }
    function compareTo(arr) {
        if (arr.length == 1) return f += "return str === '" + arr[0] + "';";
        f += "switch(str){";
        for (var i = 0; i < arr.length; ++i) f += "case '" + arr[i] + "':";
        f += "return true}return false;";
    }

    // When there are more than three length categories, an outer
    // switch first dispatches on the lengths, to save on comparisons.
    if (cats.length > 3) {
        cats.sort(function(a, b) {
            return b.length - a.length;
        });
        f += "var prefix = " + (prefix ? "true": "false") + ";if(prefix) str = str.replace(/^-(?:\\w+)-/,'');switch(str.length){";
        for (var i = 0; i < cats.length; ++i) {
            var cat = cats[i];
            f += "case " + cat[0].length + ":";
            compareTo(cat);
        }
        f += "}";

        // Otherwise, simply generate a flat `switch` statement.
    } else {
        compareTo(words);
    }
    return new Function("str", f);
}

_.isNotAcceptByBlock = _.makePredicate('rgba dimension string boolean text null url values valueslist');

_.makePredicate2 = function(words) {
    if (typeof words !== 'string') {
        words = words.join(' ');
    }
    return function(word) {
        return (~words.indexOf(word))
    }
}

_.perf = function(fn, times, args) {
    var date = +new Date;
    for (var i = 0; i < times; i++) {
        fn.apply(this, args || []);
    }
    return + new Date - date;
}

_.extend = function(o1, o2, override) {
    for (var j in o2) {
        if(j.charAt(0) === '_') continue;
        if (o1[j] == null || override) o1[j] = o2[j];
    }
    return o1;
}

_.copy = function(obj, keys){
    var res = {};
    keys.forEach(function(key){
        res[key] = obj[key];
    });
    return res;
}



// debuger
_.debugger = 1;
_.log = function() {
    if (_.debugger < 3) return;
    console.log.apply(console, arguments);
}
_.warn = function() {
    if (_.debugger < 2) return;
    console.warn.apply(console, arguments);
}
_.error = function() {
    if (_.debugger < 1) return;
    console.error.apply(console, arguments);
}

//
_.uuid = function(t) {
    var _uid = 1;
    t = t || '';
    return function() {
        return t + _uid++;
    }
},


// write = (callback) -> fs.writeFile path, data, callback
//   write (error) ->
//     return callback null, path, data unless error?
//     mkdirp (sysPath.dirname path), 0o755, (error) ->
//       return callback error if error?
//       write (error) ->
//         callback error, path, data

_.writeFile = function(fullpath, data, callback){
    function write(cb){
        fs.writeFile(fullpath, data, cb)
    }
    write(function(error){
        if(!error) return callback(null, fullpath, data);
        mkdirp(path.dirname(fullpath), 0755, function(error){
            if(error) return callback(error);
            write(function(error){
                callback(error, fullpath, data)
            })
        })
    })
}


/**
 * flatten a array
 */
_.flatten = function(array){
    var res = [];
    _.slice(array).forEach(function(item, index){
        if(!item) return;
        if(Array.isArray(item)){
            res = res.concat(_.flatten(item))
        }else{
            res.push(item);
        }
    })
    return res;
}

// unsercore throttle
_.throttle = function(func, wait, immediate) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && immediate === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
};

_.restrict = function(func, interval){
    var previous;
    return function(){
        var now = +new Date;
        if(!previous || now - previous > interval){
            func.apply(this, arguments);
        }
        previous = now;
    }
}

// default id generator
_.uid = _.uuid();

_.merge = function(list, ast) {
    if (!ast) return;
    var type = ast.type;
    if (type  === 'block' || type === 'stylesheet') {
        return _.merge(list, ast.list);
    }
    if (Array.isArray(ast)) {
        for (var i = 0, len = ast.length; i < len; i++) {
            _.merge(list, ast[i])
        }
    } else if(ast.type && !_.isNotAcceptByBlock(ast.type.toLowerCase())){
        list.push(ast)
    }
}

/**
 * the smallest typeof
 */
_.typeOf = function(obj) {
    return obj == null
    /*means null or undefined*/
    ? String(obj) : Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
}

// slice.call(arguments)
_.slice = function(arr, start, last) {
    return slice.call(arr, start, last);
}

_.watch = function(file, callback){
    var isWin = process.platform === 'win32';
    if (isWin) {
        fs.watch(file, function(event) {
            if (event === 'change') callback(file);
        });
    } else {
        fs.watchFile(file, { interval: 200 }, function(curr, prev) {
            if (curr.mtime > prev.mtime) callback(file);
        });
  }
}

_.round = function(num, percision){
    if(!percision) percision = Math.pow(10, 6);
    return Math.round(num * percision) / percision;
}

_.cache = function(max){
    var keys = [],
        cache = {};
    return {
        set: function(key, value) {
          if (keys.length > this.length) {
            delete cache[keys.shift()];
          }
          // 只有非undefined才可以
          if(cache[key] == undefined){
            keys.push(key);
          }
          cache[key] = value;
          return value;
        },
        get: function(key) {
          if (key === undefined) return cache;
          return cache[key];
        },
        length: max,
        len:function(){
          return keys.length;
        }
    };
}






module.exports = _;