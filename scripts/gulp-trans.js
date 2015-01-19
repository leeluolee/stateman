// gulp mcss plugin
var through = require('through2');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');

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

    var str = file.contents.toString('utf8');

    var str_zh = str.replace(/<\!-- t -->[\s\S]*?<\!-- s -->/g, "").replace(/\{([^{}]+)\%([^{}]+)\}/g,function(all, one, two){
      return two;
    })
    var str_en = str.replace(/<\!-- s -->[\s\S]*?<\!-- \/t -->/g, "").replace(/\{([^\{}]+)\%([^\{}]+)\}/g,function(all, one, two){
      return one;
    })



    var file_zh = new gutil.File({
      cwd: "",
      base: "",
      path: path.basename(file.path).replace(".md", "-zh.md"),
      contents: new Buffer(str_zh)
    });
    var file_en = new gutil.File({
      cwd: "",
      base: "",
      path: path.basename(file.path).replace(".md", "-en.md"),
      contents: new Buffer(str_en)
    });

    this.push(file_zh);
    this.push(file_en);
    cb(null);
  }

  return through.obj(transform);
};