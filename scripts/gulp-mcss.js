// gulp mcss plugin
var through = require('through2');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var mcss = require('mcss');

var PluginError = gutil.PluginError;

var extend = function(o1, o2, override){
  for(var i in o2) if(override || o1[i] === undefined){
    o1[i] = o2[i]
  }
  return o1;
}

module.exports = function (opt) {
  
  function transform(file, enc, cb) {
    if (file.isNull()) return cb(null, file); 
    if (file.isStream()) return cb(new PluginError('gulp-mcss', 'Streaming not supported'));

    var data;
    var str = file.contents.toString('utf8');

    var options = extend(opt, {
      filename: file.path
    })


    try {
      data = mcss(options).translate().done(function(text){
        file.contents = new Buffer(text);
        file.path = file.path.replace(/\.mcss$/, ".css");
        cb(null, file);
      }).fail(function(err){
        mcss.error.format(err)
        console.log(err.message);
      })
    } catch (err) {
      return cb(new PluginError('gulp-mcss', err));
    }
  }

  return through.obj(transform);
};