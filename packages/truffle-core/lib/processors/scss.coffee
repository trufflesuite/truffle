sass = require 'node-sass'
path = require "path"

module.exports = (contents, file, config, process, callback) ->
  # Prevent sass from erroring about an empty file.
  contents = " " if !contents? or contents == ""

  sass.render {
    data: contents
    includePaths: [path.dirname(file)]
  }, (err, processed) ->
    if err?
      callback(err)
      return

    callback(null, processed.css.toString())
