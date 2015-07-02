#!/usr/bin/env ./node_modules/.bin/coffee
# Coffee intermediary to massage arguments before calling grunt.
fork = require("child_process").fork

file = process.argv[2]

if !file?
  args = ["list"]
else
  args = ["exec", "--file", file]

fork "#{process.env.TRUFFLE_NPM_LOCATION}/node_modules/.bin/grunt", args, {
  env: 
    TRUFFLE_NPM_LOCATION: process.env.TRUFFLE_NPM_LOCATION
    TRUFFLE_WORKING_DIRECTORY: process.env.TRUFFLE_WORKING_DIRECTORY
}