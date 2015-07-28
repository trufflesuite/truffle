#!/usr/bin/env ./node_modules/.bin/babel-node
// Intermediary to massage arguments before calling grunt.
var fork = require("child_process").fork;
var file = process.argv[2];

if (file == null) {
  var args = ["list"];
} else {
  var args = ["exec", "--file", file];
}

fork(`${process.env.TRUFFLE_NPM_LOCATION}/node_modules/.bin/grunt`, args, {
  env: {
    TRUFFLE_NPM_LOCATION: process.env.TRUFFLE_NPM_LOCATION,
    TRUFFLE_WORKING_DIRECTORY: process.env.TRUFFLE_WORKING_DIRECTORY
  }
});