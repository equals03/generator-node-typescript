process.env.TS_NODE_FAST = true

const
  DEBUG = process.env.NODE_ENV === 'debug'
  , CI = process.env.CI === 'true'

  , gulp = require('gulp-help')(require('gulp'))
  , gutil = require('gulp-util')
  , tslint = require('gulp-tslint')
  , mocha = require('gulp-spawn-mocha')
  , filter = require('gulp-filter')
  , changed = require('gulp-changed')
  , sequence = require('gulp-sequence')
  , plumber = require('gulp-plumber')
  , watch = require('gulp-watch')
  , foreach = require('gulp-flatmap')
  , tsconfig = require('gulp-tsconfig')
  , rename = require('gulp-rename')
  
  , exec = require('child_process').exec
  , execFileSync = require('child_process').execFileSync
  , path = require('path')
  , del = require('del')
  
function asArray(any) {
  if(!any) return null

  if (any.constructor !== Array) {
    any = [any]
  }

  return any
}


var watching = false
  , tsConfig = require('./tsconfig.json')
  , tsCompilerOptions = tsConfig.compilerOptions || {}
    // custom build extensions to support all the crazy in here  
  , tsBuildOptions = tsConfig.buildOptions || { }

  , tsprjgenPath = './'
  , tsprjgen = '.gtsconfig.json'
  , tsc = './node_modules/typescript/bin/tsc'


tsBuildOptions = {
    files: asArray(tsBuildOptions.files) || ['./**/*.ts?(x)']
  , tests: asArray(tsBuildOptions.tests) || ['./test/**/*-spec.ts']
  , declarations: asArray(tsBuildOptions.declarations) || ['node_modules/@types/**/*.d.ts']
  , include: asArray(tsBuildOptions.include)
  , strictLint: !!tsBuildOptions.strictLint
}

  
  
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


gulp.task('generate-tsconfig', 'generates a tsconfig for use by tsc', function () {
  var files = tsBuildOptions.files
                .concat(tsBuildOptions.declarations)

  return gulp
    .src(files)
    .pipe(tsconfig({ tsConfig: tsConfig })())
    .pipe(rename(tsprjgen))
    .pipe(gulp.dest(tsprjgenPath))
})

gulp.task('clean', 'cleans the generated js files from lib directory', function () {
  var files = asArray(tsprjgenPath + tsprjgen)
  if (tsCompilerOptions.outDir)
    files.push(tsCompilerOptions.outDir)

  return del(files).then(function (paths) {
    if(paths.length <= 0)
      return

    gutil.log('Vapourised the following:')
    paths.forEach(function (path) {
      console.log('\t   =>     ' + gutil.colors.magenta(path))
    })
    gutil.log(gutil.colors.red.bold('Hasta-la-vista. Baby.'))
    
  })
})

gulp.task('lint', 'lints all TypeScript source files', function () {
  return gulp
    .src(tsBuildOptions.files)
    // make sure that only ts files get through
    .pipe(filter('**/*.ts?(x)'))
    .pipe(tslint({
      tslint: require('tslint'),
      formatter: 'stylish'
    }))
    .pipe(tslint.report({
      emitError: tsBuildOptions.strictLint && !watching,
      summarizeFailureOutput: true
    }))
})

gulp.task('include', 'copies the additional files to the outDir', function () {
  if (!tsBuildOptions.include || !tsCompilerOptions.outDir) {
    return
  } else {
    return gulp
      .src(tsBuildOptions.include)
      .pipe(plumber())
      // only copy missing or changed
      .pipe(changed(tsCompilerOptions.outDir))
      .pipe(gulp.dest(tsCompilerOptions.outDir))
      .pipe(foreach(function (stream, file) {
        console.log('\t   ' + gutil.colors.blue.bold(path.relative(file.cwd, file.history[0])) +
          '\n\t=> ' + gutil.colors.magenta(path.relative(file.cwd,file.history[1])))
        return stream
      }))
  }
})

gulp.task('compile', 'compiles based on dynamically generated tsconfig using the tsc version', ['generate-tsconfig'], function (cb) {
  try {
    var version = execFileSync(tsc, ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] })
    gutil.log('Using Typescript ' + gutil.colors.cyan(version))
    execFileSync(tsc, ['-p', tsprjgenPath + tsprjgen], { stdio: ['pipe', 'pipe', 'pipe'] })
    cb()
  } catch (err) {
    console.log(gutil.colors.white.bold(err.stdout.toString('utf8')))
    cb()
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
    .src(tsBuildOptions.tests)
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
  return watch(tsBuildOptions.files, { ignoreInitial: false }, function () {
    gulp.start('build')
  })
})

gulp.task('watch-test', 'Watches test source files and runs tests on change', function () {
  var files = tsBuildOptions.files
                .concat(tsBuildOptions.tests)
  
  watching = true
  return watch(files, { ignoreInitial: false }, function () {
    gulp.start('test')
  })
})

gulp.task('watch', 'Watches ts source files & test source file and runs build & test on change', function () {
  var files = tsBuildOptions.files
                .concat(tsBuildOptions.tests)
  
  watching = true
  return watch(files, { ignoreInitial: false }, function () {
    sequence('build', 'test')()
  })
})
