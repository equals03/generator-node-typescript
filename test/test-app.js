'use strict';

var path = require('path');
var assert = require('yeoman-generator').assert;
var helpers = require('yeoman-generator').test;
var os = require('os');

describe('node-typescript:app with gulp', function () {
  before(function (done) {
    helpers.run(path.join(__dirname, '../generators/app'))
      .withOptions({
        skipInstall: true
      })
      .on('end', done);
  });

  it('creates necessary files', function () {
    assert.file([
      '.vscode/tasks.json',
      '.vscode/settings.json',
      'src/index.ts',
      'test/mocha-spec.ts',
      'package.json',
      'gulpfile.js',
      'tsconfig.json',
      'tslint.json',
      '.editorconfig',
      '.gitignore',
      'README.md'
    ]);
  });

});

