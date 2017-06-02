var path = require("path");
var fs = require("fs");
var OS = require("os");
var prependFile = require('prepend-file');
var WebpackOnBuildPlugin = require('on-build-webpack');
var webpack = require('webpack')

var outputDir = path.join(__dirname, '..');
var outputFilename = 'cli.bundled.js';

module.exports = {
  entry: path.join(__dirname, "..", "cli.js"),
  target: 'node',
  output: {
    path: outputDir,
    filename: outputFilename
  },
  module: {
    rules: [
      { test: /\.js$/, use: "shebang-loader" }
    ]
  },
  externals: [
    // If you look at webpack's docs, `externals` doesn't need to be a function.
    // But I never got it to work otherwise, so this is a function because "it works".
    function(context, request, callback) {

      // truffle-config uses the original-require module.
      // Here, we leave it as an external, and use the original-require
      // module that's a dependency of Truffle instead.
      if (/^original-require$/.test(request)) {
        return callback(null, 'commonjs original-require');
      }

      // We want to leave solc as an eternal dependency as well (for now)
      if (/^solc$/.test(request)) {
        return callback(null, 'commonjs solc');
      }

      callback();
    }
  ],
  plugins: [
    // Put the shebang back on and make sure it's executable.
    new WebpackOnBuildPlugin(function(stats) {
      var outputFile = path.join(outputDir, outputFilename);
      if (fs.existsSync(outputFile)) {
        prependFile.sync(outputFile, '#!/usr/bin/env node' + OS.EOL);
        fs.chmodSync(outputFile, '755');
      }
    })
  ],
  resolve: {
    alias: {
      // fsevents is used by chokidar and is an optional requirement
      // It doesn't pack well, and is OS X specific, so let's get rid of it.
      "fsevents": path.join(__dirname, "..", "./nil.js"),
      "ws": path.join(__dirname, "..", "./nil.js"),
      "scrypt": "js-scrypt",
      "secp256k1": path.join(__dirname, "..", "node_modules", "secp256k1", "elliptic.js")
    }
  }
}
