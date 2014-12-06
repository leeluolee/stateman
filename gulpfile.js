var through = require('through2');
var gulp = require('gulp');
var webpack = require('gulp-webpack');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var uglify = require('gulp-uglify');


var pkg = require("./package.json");  


    
var wpConfig = {
 output: {
    filename: "casca.js",
    library: "casca",
    libraryTarget: "umd"
  }
}

var routerConfig = {
  output: {
    filename: "rerouter.js",
    library: "rerouter",
    libraryTarget: "umd"
  },
  externals: {
    "casca": "casca"
  }
}


gulp.task('jshint', function(){
      // jshint
  gulp.src(['src/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))

})

 
gulp.task('build', ['jshint'], function() {
  gulp.src("src/index.js")
    .pipe(webpack(wpConfig))
    .pipe(wrap(signatrue))
    .pipe(gulp.dest('./'))
    .pipe(wrap(mini))
    .pipe(uglify())
    .pipe(gulp.dest('./'))
    .on("error", function(err){
      throw err
    })
});
gulp.task('webpack',  function() {
  gulp.src("src/router.js")
    .pipe(webpack(routerConfig))
    .pipe(gulp.dest('./'))

    .on("error", function(err){
      throw err
    })
});


gulp.task('watch', function(){
  gulp.watch(['src/**/*.js'], ['build'])
})



function wrap(fn){
  return through.obj(fn);
}

function signatrue(file, enc, cb){
  var sign = '/**\n'+ '@author\t'+ pkg.author.name + '\n'+ '@version\t'+ pkg.version +
    '\n'+ '@homepage\t'+ pkg.homepage + '\n*/\n';
  file.contents =  Buffer.concat([new Buffer(sign), file.contents]);
  cb(null, file);
}

function mini(file, enc, cb){
  file.path = file.path.replace('.js', '.min.js');
  cb(null, file)
}