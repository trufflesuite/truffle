fs = require "fs"
jsmin = require("jsmin").jsmin
_ = require "lodash"

module.exports = (full_path, base={}, callback) ->
  if typeof base == "function"
    callback = base
    base = {}

  # We could 
  fs.readFile full_path, "utf8", (err, file_contents) ->
    if err?
      callback(err, file_contents)
      return
 
    file_contents = JSON.parse(jsmin(file_contents))
    file_contents = _.merge(base, file_contents)

    callback(null, file_contents)