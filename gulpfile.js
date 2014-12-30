var gulp = require('gulp');
var fs = require('fs');
var regularify = require('regularify');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var mcss = require("./scripts/gulp-mcss.js");


gulp.task('browserify', function(done){

  return browserify(['./src/index.js'])
    .transform(regularify({
      BEGIN: '{', END: '}',
      extensions: ['html']
    }))
    .bundle()
    .on('error', function(err){
      console.log('!!!!!!!!!!!!' + err)
      // kao....
      done(null)
      this.end();
    })
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('./'));
    done();
});


gulp.task('mcss', function(){
  gulp.src('./mcss/index.mcss')
    .pipe(mcss({}))
    .pipe(gulp.dest('./'));
})





gulp.task('watch', ['browserify', 'mcss'], function() {
  gulp.watch(['src/**'], ['browserify']);
  gulp.watch(['mcss/**'], ['mcss']);
});
gulp.task('default', [ 'watch']);
