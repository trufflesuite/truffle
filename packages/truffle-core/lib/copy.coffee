cpr = require "cpr"
fs = require "fs"
_ = require "lodash"

cpr_options = 
  deleteFirst: false
  overwrite: false
  confirm: true
  
copy = (from, to, extra_options, callback) ->
  if typeof extra_options == "function"
    callback = extra_options
    extra_options = {}

  options = _.merge(_.clone(cpr_options), extra_options)

  cpr from, to, options, (err, files) ->
    new_files = []

    # Remove placeholders. Placeholders allow us to copy "empty" directories,
    # but lets NPM and git not ignore them.
    for file in files || []
      if file.match(/.*PLACEHOLDER.*/)?
        fs.unlinkSync(file) 
        continue
      new_files.push file

    callback(err, new_files)

module.exports = copy