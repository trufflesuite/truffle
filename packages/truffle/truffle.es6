#!/usr/bin/env ./node_modules/.bin/babel-node
// Coffee intermediary to massage arguments before calling grunt.
var fork = require("child_process").fork;

debugger;

// Filter command line arguments, swapping some grunt defaults for our own.
var args = [];
var index = -1;
for (var arg of process.argv) {
  index += 1;
  if (index <= 1) continue;
  if (arg == "--help" || arg == "-h") arg = "list";
  if (arg == "--version" || arg == "-V") arg = "version";
  args.push(arg);
}

fork(`${process.env.TRUFFLE_NPM_LOCATION}/node_modules/.bin/grunt`, args, {
  env: {
    TRUFFLE_NPM_LOCATION: process.env.TRUFFLE_NPM_LOCATION,
    TRUFFLE_WORKING_DIRECTORY: process.env.TRUFFLE_WORKING_DIRECTORY
  }
});
