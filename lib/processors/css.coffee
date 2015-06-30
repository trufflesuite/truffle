# CSS processor doesn't do anything.
fs = require "fs"
module.exports = (path, config, callback) ->
  fs.readFile path, callback