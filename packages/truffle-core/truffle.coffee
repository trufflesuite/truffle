#!/usr/bin/env ./node_modules/.bin/coffee
# Coffee intermediary to massage arguments before calling grunt.
fork = require("child_process").fork

# Filter command line arguments, removing "--help"
args = []
for arg, index in process.argv
  continue if index <= 1
  arg = "list" if arg == "--help" or arg == "-h"
  arg = "version" if arg == "--version" or arg == "-V"
  args.push arg

fork "#{process.env.TRUFFLE_NPM_LOCATION}/node_modules/.bin/grunt", args, {
  env: 
    TRUFFLE_NPM_LOCATION: process.env.TRUFFLE_NPM_LOCATION
    TRUFFLE_WORKING_DIRECTORY: process.env.TRUFFLE_WORKING_DIRECTORY
}