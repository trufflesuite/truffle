module.exports = (contents, file, config, process, callback) ->
  process config, config.frontend.includes, (err, processed) ->
    if err?
      callback err
      return

    callback(null, processed + "\n\n" + contents)