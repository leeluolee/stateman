var through = require('through2');
var deploy = require("gulp-gh-pages");
var shell = require("gulp-shell");
var gulp = require('gulp');
var webpack = require('gulp-webpack');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var uglify = require('gulp-uglify');
var _ = require("./src/util.js");
var karma = require("karma").server;
var translate = require("./scripts/gulp-trans.js")


var pkg = require("./package.json");  

// release
require("./scripts/release.js")(gulp);


var wpConfig = {
 output: {
    filename: "stateman.js",
    library: "StateMan",
    libraryTarget: "umd"
  }
}

var testConfig = {
  output: {
    filename: "dom.bundle.js"
  }
}

var karmaCommonConf = {
  browsers: ['Chrome', 'Firefox', 'IE', 'IE9', 'IE8', 'IE7', 'PhantomJS'],
  frameworks: ['mocha', 'commonjs'],
  files: [
    'test/runner/vendor/expect.js',
    'src/**/*.js',
    'test/spec/test-*.js',
    'test/spec/dom-*.js'
  ],
  client: {
    mocha: {ui: 'bdd'}
  },
  customLaunchers: {
    IE9: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE9'
    },
    IE8: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE8'
    },
    IE7: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE7'
    }
  },

  preprocessors: {
     'src/**/*.js': ['commonjs', 'coverage'],
     'test/spec/test-*.js': ['commonjs'],
     'test/spec/dom-*.js': ['commonjs'],
     'test/runner/vendor/expect.js': ['commonjs']
   },

  // coverage reporter generates the coverage
  reporters: ['progress', 'coverage'],

  // preprocessors: {
  //   // source files, that you wanna generate coverage for
  //   // do not include tests or libraries
  //   // (these files will be instrumented by Istanbul)
  //   // 'test/regular.js': ['coverage']
  // },

  // optionally, configure the reporter
  coverageReporter: { 
    type: 'html' 
  }
  
};





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

gulp.task('testbundle',  function(){
  gulp.src("test/spec/dom.exports.js")
    .pipe(webpack(testConfig))
    .pipe(gulp.dest('test/runner'))
    .on("error", function(err){
      throw err
    })
})

gulp.task('mocha', function(){

  return gulp.src(['test/spec/test-*.js'])

    .pipe(mocha({reporter: 'spec' }) )

    .on('error', function(err){
      console.log(err)
      console.log('\u0007');
    })
    .on('end', function(){
      // before_mocha.clean();
    });
})


gulp.task('watch', ["build", 'testbundle'], function(){
  gulp.watch(['src/**/*.js'], ['build']);
gulp.watch(['docs/src/*.md'], ['doc']);

  gulp.watch(['test/spec/*.js', 'src/**/*.js'], ['testbundle'])
})


gulp.task('default', [ 'watch']);


gulp.task('mocha', function() {

  return gulp.src(['test/spec/test-*.js', 'test/spec/node-*.js' ])
    .pipe(mocha({reporter: 'spec' }) )
    .on('error', function(){
      // gutil.log.apply(this, arguments);
      console.log('\u0007');
    })
    .on('end', function(){
      global.expect = null;
    });
});


gulp.task('karma', function (done) {
  var config = _.extend({}, karmaCommonConf);
  if(process.argv[3] === '--phantomjs'){
    config.browsers=["PhantomJS"]
    config.coverageReporter = {type : 'text-summary'}

    karma.start(_.extend(config, {singleRun: true}), done);

  }else if(process.argv[3] === '--browser'){
    config.browsers = null;
    karma.start(_.extend(config, {singleRun: true}), done);
  }else{
    karma.start(_.extend(config, {singleRun: true}), done);
  }
});


gulp.task("test", ["mocha", "karma"])

gulp.task('doc', function(){
  return gulp.src(["docs/src/API*.md"]) 
    .pipe(translate({}))
    .pipe(gulp.dest("docs/pages/document"))
})

// 
gulp.task("release", ["tag"])


gulp.task('travis', ['jshint' ,'build','mocha',  'karma']);



gulp.task('server', ['build'], shell.task([
  "./node_modules/puer/bin/puer"
]))


gulp.task('example', function(){
  gulp.src("example/*.html")
    .pipe(
      gulp.dest('docs/pages/example')
     );
  gulp.src("./stateman.js")
    .pipe(
      gulp.dest('docs/pages')
     );
})
gulp.task('gh-pages', ['example', 'doc'], function () {
  gulp.src("docs/pages/**/*.*")
    .pipe(deploy({
      remoteUrl: "git@github.com:leeluolee/stateman",
      branch: "gh-pages"
    }))
    .on("error", function(err){
      console.log(err)
    })
});




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
