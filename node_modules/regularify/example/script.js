
var path = require("path");
var fs = require('fs');

var regularify = require('../');
var browserify = require('browserify');
var source = require('vinyl-source-stream');


return browserify([path.join(__dirname, './src/index.js')])
  .transform(regularify({
    BEGIN: '{', END: '}',
    extensions: ['txt']
  }))
  .bundle()
  .pipe(fs.createWriteStream( path.join(__dirname ,"./bundle.js")))
