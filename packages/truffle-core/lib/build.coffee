path = require "path"
async = require "async"
uglify = require "uglify-js"
Config = require "./config"

Promise = require "bluebird"
mkdirp = Promise.promisify(require "mkdirp")
rimraf = Promise.promisify(require "rimraf" );
fs = Promise.promisifyAll(require "fs")
copy = Promise.promisify(require "./copy")
File = require "./file"

class Build
  # A bit of a mess. I promisified everything for the sake of the base() function.

  @concat_and_process: Promise.promisify((config, description, files, base_path, separator, callback) ->
    if typeof separator == "function"
      callback = separator
      separator = "\n\n"

    async.reduce(files, "", (memo, file, iterator_callback) =>
      full_path = "#{base_path}/#{file}"

      config.expect(full_path, description)

      @process(config, full_path).then (processed) ->
        iterator_callback(null, memo + separator + processed)
      .catch iterator_callback
    , callback)
  )

  @process: Promise.promisify((config, file, callback) ->
    extension = path.extname(file).substring(1).toLowerCase()
    
    # Is there a user specified extension?
    processor = config.processors[extension]
    
    if !processor?
      callback("Could not find processor for file type '#{extension}'. File: #{file}")
      return

    fs.readFileAsync(file, "utf8").then (contents) ->
      processor contents, config, callback
    .catch callback
  )

  @base: Promise.promisify((config, key, callback) ->
    # Remember: All these functions are promises. 

    # Clean first.
    rimraf(config[key].directory).then () ->
      mkdirp(config[key].directory)
    .then () ->
      mkdirp(config[key].assets.directory)
    .then () ->
      copy(config.assets.directory, config[key].directory)
    .then () ->
      File.duplicate(config.html.filename, config[key].html_filename)
    .then () =>
      @concat_and_process config, "script", config.app.javascripts, config.javascripts.directory
    .then (processed) ->
      fs.writeFile config[key].javascript_filename, processed, 'utf8'
    .then () =>
      @concat_and_process config, "stylesheet", config.app.stylesheets, config.stylesheets.directory
    .then (processed) ->
      fs.writeFile config[key].stylesheet_filename, processed, 'utf8'
    .then(callback)
    .catch (e) ->
      callback(e)
  )

  @expect: (config) ->
    config.expect(config.app.configfile, "app configuration")
    config.expect(config.javascripts.directory, "javascripts directory")
    config.expect(config.stylesheets.directory, "stylesheets directory")

  @build: Promise.promisify((config, callback) ->
    @expect(config)
    @base(config, "build").then(callback).catch(callback)
  )

  @dist: Promise.promisify((config, callback) ->
    @expect(config)
    @base(config, "dist").then () ->
      File.process(config.dist.javascript_filename, (js) ->
        return uglify.minify(js, {fromString: true}).code
      , callback)
    .catch(callback)
  )

module.exports = Build