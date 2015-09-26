// form https://github.com/lfender6445/gulp-release-tasks/blob/master/package.json
// but stateman also need release to component.json
module.exports = function (gulp) {

    var argv = require('yargs').argv;
    var bump = require('gulp-bump');
    var fs = require('fs');
    var git = require('gulp-git');
    // var runSequence = require('gulp-run-sequence');
    var spawn = require('child_process').spawn;
    var tag_version = require('gulp-tag-version');
    var through = require('through2');
    var _ = require('lodash');

    var branch = argv.branch || 'master';
    var rootDir = require('path').resolve(argv.rootDir || './') + '/';

    var commitIt = function (file, enc, cb) {
        if (file.isNull()) return cb(null, file);
        if (file.isStream()) return cb(new Error('Streaming not supported'));

        var commitMessage = "Bumps version to " + require(file.path).version;
        gulp.src('./*.json', {cwd: rootDir}).pipe(git.commit(commitMessage, {cwd: rootDir}));
    };

    var paths = {
        versionsToBump: _.map(['package.json', 'bower.json', 'manifest.json', 'component.json'], function (fileName) {
            return rootDir + fileName;
        })
    };

    // gulp.task('release', function (cb) {
    //     runSequence('tag-and-push', 'npm-publish', 'bump', cb);
    // });

    gulp.task('tag-and-push', function () {
        var pkg = require(rootDir + 'package.json');

        return gulp.src('./', {cwd: rootDir})
            .pipe(tag_version({version: pkg.version, cwd: rootDir}))
            .on('end', function () {
                git.push('origin', branch, {args: '--tags', cwd: rootDir});
            });
    });

    var versioning = function () {
        if (argv.minor) {
            return 'minor';
        }
        if (argv.major) {
            return 'major';
        }
        return 'patch';
    };

    gulp.task('bump', function () {
        gulp.src(paths.versionsToBump, {cwd: rootDir})
            .pipe(bump({type: versioning()}))
            .pipe(gulp.dest('./', {cwd: rootDir}))
            .pipe(through.obj(commitIt))
            // .pipe(git.push('origin', branch, {cwd: rootDir}));
    });

    gulp.task('npm-publish', function (done) {
        spawn('npm', ['publish', rootDir], {stdio: 'inherit'}).on('close', done);
    });

};
// module.exports = function(gulp){
//   var argv, bump, fs, git, paths, prompt, tag_version, versioning;

//   fs = require('fs');
//   prompt = require('gulp-prompt');
//   git = require('gulp-git');
//   bump = require('gulp-bump');
//   tag_version = require('gulp-tag-version');
//   argv = require('yargs').argv;

//   var versioningFiles = function(){
//     var files = [];
//     var pkg_exists = fs.existsSync('package.json');
//     var bower_exists = fs.existsSync('bower.json');
//     var component_exists = fs.existsSync('component.json');

//     if(argv.npm && pkg_exists) files.push("./package.json");
//     if(argv.bower && bower_exists) files.push("./bower.json")
//     if(argv.component && component_exists) files.push("./component.json")

//     if(!argv.npm || !argv.bower || !argv.component){
//        pkg_exists && files.push("./package.json")
//        bower_exists && files.push("./bower.json")
//        component_exists && files.push("./component.json")
//     }
//     return files;
//   };

//   var bumpPreference = fs.existsSync('package.json')  ? 'package.json' : 'bower.json';
//   var vFiles         = versioningFiles();

//   paths = {
//     versionsToBump: vFiles,
//     version: bumpPreference,
//     dest: '.'
//   };

//   gulp.task('tag', ['commit'], function() {
//     return gulp.src(paths.versionsToBump).pipe(tag_version())  
//     // .pipe(git.push('origin', 'master', {
//     //       args: '--tags'
//     //     })).on('error', function(err){
//     //       console.log(err)
//     //     });


//   });

//   gulp.task('add', ['bump'], function() {
//     return gulp.src(paths.versionsToBump).pipe(git.add());
//   });


//   gulp.task('commit', ['add'], function() {
//     return gulp.src(paths.version).pipe(prompt.prompt({
//       type: 'input',
//       name: 'commit',
//       message: 'enter a commit msg, eg initial commit'
//     }, function(res) {
//       return gulp.src('.').pipe(git.commit(res.commit));
//     }));
//   });

//   versioning = function() {
//     if (argv.minor || argv.feature) {
//       return 'minor';
//     }
//     if (argv.major) {
//       return 'major';
//     }
//     return 'patch';
//   };

//   gulp.task('bump', function() {
//     return gulp.src(paths.versionsToBump).pipe(bump({
//       type: versioning()
//     })).pipe(gulp.dest(paths.dest));
//   });


// };