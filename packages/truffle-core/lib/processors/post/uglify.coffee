UglifyJS = require "uglify-js"

module.exports = (contents, file, config, process, callback) ->
  try 
    code = UglifyJS.minify(contents, {fromString: true}).code
    callback null, code
  catch e
    callback e