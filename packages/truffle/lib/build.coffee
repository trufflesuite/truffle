path = require "path"
async = require "async"

Promise = require "bluebird"
mkdirp = Promise.promisify(require "mkdirp")
rimraf = Promise.promisify(require "rimraf" );
fs = Promise.promisifyAll(require "fs")
copy = Promise.promisify(require "./copy")
File = require "./file"
normalfs = require "fs"
_ = require "lodash"

CoffeeScript = require "coffee-script"

class Build
  # A bit of a mess. I promisified everything for the sake of the base() function.

  @process_file: (config, file, callback) ->
    extension = path.extname(file).toLowerCase()
    processor = config.processors[extension]

    if !processor?
      callback(new Error("Could not find processor for file type '#{extension}'. File: #{file}"))
      return

    normalfs.readFile file, "utf8", (err, contents) =>
      if err?
        callback(err)
        return

      processor(contents, file, config, Build.process_files, callback)

  @process_files: (config, files, base_path, separator, callback) ->
    if typeof base_path == "function"
      separator = base_path
      base_path = null

    if typeof separator == "function"
      callback = separator
      separator = "\n\n"

    if typeof files == "string"
      files = [files]

    async.reduce files, "", (memo, file, iterator_callback) =>
      if base_path?
        full_path = "#{base_path}/#{file}"
      else 
        full_path = file

      config.expect(full_path)

      # Call this function from the Build object since
      # @process_files is passed around and may not always have
      # the correct scope.
      Build.process_file config, full_path, (err, processed) ->
        if err?
          iterator_callback(err)
          return

        iterator_callback(null, memo + separator + processed)
    , callback

  @process_directory: (config, target, key, callback) ->
    value = config.app.resolved.frontend[target]
    destination_directory = "#{config[key].directory}/#{target}"
    source_directory = "#{config.app.directory}/#{value.files[0]}"

    config.expect(source_directory, "source directory for target #{target}", "Check app configuration.")

    mkdirp(destination_directory).then () ->
      copy(source_directory, destination_directory).then () ->
    .then(callback).catch(callback)

  @process_target: (config, target, key, callback) ->
    # Is this a directory? 
    if target[target.length - 1] == "/"
      @process_directory(config, target, key, callback)
      return

    files = config.app.resolved.frontend[target].files
    post_processing = config.app.resolved.frontend[target]["post-process"][key]
    target_file = "#{config[key].directory}/#{target}"

    @process_files config, files, config.app.directory, (err, processed) =>
      if err?
        callback(err)
        return

      # Now do post processing.
      async.reduce post_processing, processed, (memo, processor_name, post_processor_finished) =>
        post_processor = config.processors[processor_name]

        if !post_processor?
          post_processor_finished(new Error("Cannot find processor named '#{processor_name}' during post-processing. Check app configuration."))
          return

        post_processor(memo, target_file, config, Build.process_files, post_processor_finished)
      , (err, final_post_processed) ->
        if err?
          callback(err)
          return

        mkdirp(path.dirname(target_file)).then () ->
          fs.writeFile target_file, final_post_processed, 'utf8'
        .then(callback)
        .catch(callback)

  @process_all_targets: (config, key, callback) ->
    async.eachSeries Object.keys(config.app.resolved.frontend), (target, finished_with_target) =>
      @process_target config, target, key, finished_with_target
    , callback

  @base: Promise.promisify((config, key, callback) ->
    # Remember: All these functions are promises. 

    # Clean first.
    rimraf(config[key].directory).then () ->
      mkdirp(config[key].directory)
    .then () =>
      @process_all_targets(config, key, callback)
  )

  @expect: (config) ->
    config.expect(config.app.configfile, "app configuration")

  @build: Promise.promisify((config, callback) ->
    @expect(config)
    @base(config, "build").then(callback).catch(callback)
  )

  @dist: Promise.promisify((config, callback) ->
    @expect(config)
    @base(config, "dist").then(callback).catch(callback)
  )

module.exports = Build