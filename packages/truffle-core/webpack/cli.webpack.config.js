var path = require("path");
var fs = require("fs");
var OS = require("os");
var prependFile = require('prepend-file');
var WebpackOnBuildPlugin = require('on-build-webpack');

var outputDir = path.join(__dirname, '..', 'build');
var outputFilename = 'cli.node.js';

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
      "ws": path.join(__dirname, "..", "./nil.js"),
      "scrypt": "js-scrypt",
      "secp256k1": path.join(__dirname, "..", "node_modules", "secp256k1", "elliptic.js")
    }
  }
}
