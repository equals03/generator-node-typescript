process.env.TS_NODE_FAST = true

const
  DEBUG = process.env.NODE_ENV === 'debug'
  , CI = process.env.CI === 'true'

  , gulp = require('gulp-help')(require('gulp'))
  , gutil = require('gulp-util')
  , typescript = require('gulp-typescript')
  , tslint = require('gulp-tslint')
  , mocha = require('gulp-spawn-mocha')
  , filter = require('gulp-filter')
  , changed = require('gulp-changed')
  , sequence = require('gulp-sequence')
  , plumber = require('gulp-plumber')
  , watch = require('gulp-watch')
  , foreach = require('gulp-foreach')

  , exec = require('child_process').exec
  , path = require('path')
  , del = require('del')

require('dotbin')

var watching = false
  , tsProject = typescript.createProject('./tsconfig.json', {
    typescript: require('typescript')
  })

  , tsConfig = tsProject.config || {}
  , tsCompilerOptions = tsConfig.compilerOptions || {}

  , tsFiles = tsConfig.files || tsConfig.filesGlob || ['./**/*.ts?(x)']
  , tsAdditional = tsConfig.additional
  , tsOutDir = tsCompilerOptions.outDir
  , testFiles = tsConfig.testsGlob || ['./test/**/*-spec.ts']
  , strictLint = false

function errHandler(options) {
  options = options || { snuff: false, exit: true }
  return function (err) {
    if (!options.snuff) gutil.log(gutil.colors.yellow(err.toString()));
    if (!options.exit) {
      this.emit('end');
    } else {
      process.exit(1);
    }
  }
}
function asArray(any) {
  any = any || []
  if (any.constructor !== Array) {
    any = [any]
  }

  return any
}

gulp.task('clean', 'cleans the generated js files from lib directory', function () {
  if (!tsOutDir) {
    console.log('no outDir set! i\'m not doing jack!')
    return
  }

  return del([
    tsOutDir
  ])
})

gulp.task('lint', 'lints all TypeScript source files', function () {
  return gulp
    .src(tsFiles)
    //.pipe(plumber())
    // make sure that only ts files get through
    .pipe(filter('**/*.ts?(x)'))
    .pipe(tslint({
      tslint: require('tslint'),
      formatter: 'stylish'
    }))
    .pipe(tslint.report({
      emitError: strictLint && !watching,
      summarizeFailureOutput: true
    }))
})

gulp.task('compile', 'compiles all TypeScript source files', function () {
  gutil.log(
    'Using Typescript ' + gutil.colors.cyan('\'v' + tsProject.typescript.version + '\'')
  )

  var result = gulp
    .src(tsFiles)
    .pipe(plumber())
    .pipe(typescript(tsProject, typescript.reporter.longReporter))
    .pipe(gulp.dest(tsOutDir))

  return result
})

gulp.task('include', 'copies the additional files to the outDir', function () {
  if (!tsAdditional || !tsOutDir) {
    return
  } else {
    return gulp
      .src(tsAdditional)
      .pipe(plumber())
      // only copy missing or changed
      .pipe(changed(tsOutDir))
      .pipe(gulp.dest(tsOutDir))
      .pipe(foreach(function (stream, file) {
        gutil.log('Copied ' + gutil.colors.magenta(file.history[0]) + 
           '\n\t   =>     ' + gutil.colors.magenta(file.history[1]))
        return stream
      }))
  }
})


gulp.task('build', 'compiles all TypeScript source and copies any additional files', function (cb) {
  sequence('include', 'lint', 'compile')(cb)
})
gulp.task('rebuild', 'cleans and rebuilds the project', function (cb) {
  sequence('clean', 'build')(cb)
})

gulp.task('test', 'runs the Mocha test specs', function () {
  return gulp
    .src(testFiles)
    .pipe(plumber(errHandler({ snuff: true, exit: !watching })))
    .pipe(mocha({
      debugBrk: DEBUG,
      inlineDiffs: true,
      R: CI ? 'spec' : 'nyan',
      istanbul: !DEBUG,
      require: ['ts-node/register']
    }))

})

gulp.task('watch-build', 'Watches ts source files and runs build on change', function () {
  watching = true
  return watch(tsFiles, { ignoreInitial: false }, function () {
    gulp.start('build')
  })
})

gulp.task('watch-test', 'Watches test source files and runs tests on change', function () {
  watching = true
  return watch(testFiles, { ignoreInitial: false }, function () {
    gulp.start('test')
  })
})

gulp.task('watch', 'Watches ts source files & test source file and runs build & test on change', function () {
  sourceFiles = asArray(tsFiles).concat(asArray(testFiles))

  watching = true
  return watch(sourceFiles, { ignoreInitial: false }, function () {
    sequence('build', 'test')()
  })
})
