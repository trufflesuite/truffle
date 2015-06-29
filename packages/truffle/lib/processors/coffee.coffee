# {execFile} = require 'child_process'

# # Call out to coffee so we can get some good error messages.
# module.exports = (path, config, callback) ->
#   console.log "#{config.truffle_dir}/node_modules/.bin/coffee -c -p #{path}"
#   execFile "#{config.truffle_dir}/node_modules/.bin/coffee", ["-p", path], (err, code, stderr) ->
#     console.log "------------------"
#     console.log code
#     if err? or stderr?
#       callback(err || stderr)
#       return

#     callback(null, code)

CoffeeScript = require 'coffee-script'
fs = require "fs"

module.exports = (path, config, callback) ->
  fs.readFile path, "utf8", (err, data) ->
    if err?
      callback(err)
      return

    try
      callback null, CoffeeScript.compile(data)
    catch e
      callback(e)
  