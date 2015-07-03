# Null processor doesn't do anything, and will never do anything.
module.exports = (contents, file, config, process, callback) ->
  callback null, contents