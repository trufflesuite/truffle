sass = require 'node-sass'

module.exports = (path, config, callback) ->
  sass.render file: path, (err, processed) ->
    if err?
      callback(err)
      return

    callback(null, processed.css.toString())
