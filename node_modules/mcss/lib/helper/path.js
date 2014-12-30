var syspath = require('path'),
    slice = [].slice;

if(syspath) module.exports = syspath;
else{

  
exports.fake = true
exports.join = join;
exports.normalize =normalize;
exports.dirname = dirname;
exports.extname = extname;
// exports.basename = basename;
exports.isAbsolute = isAbsolute;


// THANKS for seajs's tiny path.js
// ===================================
// https://github.com/seajs/seajs/blob/master/src/util-path.js

var slice = [].slice;
var DIRNAME_RE = /[^?#]*\//

var DOT_RE = /\/\.\//g
var MULTIPLE_SLASH_RE = /(:\/)?\/\/+/g
var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//

var URI_END_RE = /\?|\.(?:css|mcss)$|\/$/

function dirname(path) {
  return path.match(DIRNAME_RE)[0]
}

function normalize(path) {
  path = path.replace(DOT_RE, "/")

  path = path.replace(MULTIPLE_SLASH_RE, "$1\/")

  while (path.match(DOUBLE_DOT_RE)) {
    path = path.replace(DOUBLE_DOT_RE, "/")
  }
  return path
}


function join(url, url2){
    var args = slice.call(arguments);
    var res = args.reduce(function(u1, u2){
        return u1 + '/' +u2
    })
    return normalize(res)
}

function extname(url){
    var res = url.match(/(\.\w+)[^\/]*$/);
    if(res && res[1]){
        return res[1]
    }
    return '';
}

function isAbsolute(url){
    // /a/b     file://  http://
    return /^\/|:\//.test(url);
}

}
