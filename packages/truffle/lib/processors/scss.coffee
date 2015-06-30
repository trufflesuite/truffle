sass = require 'node-sass'

module.exports = (contents, config, callback) ->
  # Prevent sass from erroring about an empty file.
  contents = " " if !contents? or contents == ""

  sass.render {
    data: contents
    includePaths: [config.stylesheets.directory]
  }, (err, processed) ->
    if err?
      callback(err)
      return

    callback(null, processed.css.toString())
