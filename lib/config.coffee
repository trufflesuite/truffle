fs = require "fs"
dir = require "node-dir"
deasync = require "deasync"
filesSync = deasync(dir.files)
subdirSync = deasync(dir.subdirs)
jsmin = require("jsmin").jsmin
_ = require "lodash"
web3 = require "web3"

loadconf = deasync(require "./loadconf")

class Config
  @gather: (truffle_dir, working_dir, grunt, desired_environment) ->
    config = {}
    config = _.merge config, 
      grunt: grunt
      truffle_dir: truffle_dir
      working_dir: working_dir
      environments: 
        directory: "#{working_dir}/config"
        available: {}
        current: {}       
      app:
        configfile: "#{working_dir}/config/app.json"
        directory: "#{working_dir}/app"
        # Default config objects that'll be overwritten by working_dir config.
        resolved:
          frontend: {}
          deploy: []
          rpc: {}
          processors: {}
      frontend: 
        contract_inserter_filename: "#{truffle_dir}/lib/insert_contracts.coffee"
        includes: [
          "#{truffle_dir}/node_modules/bluebird/js/browser/bluebird.js"
          "#{truffle_dir}/node_modules/web3/dist/web3.min.js"
          "#{truffle_dir}/node_modules/ether-pudding/build/ether-pudding.js"
        ]
      example:
        directory: "#{truffle_dir}/example"
        contract:
          directory: "#{truffle_dir}/example/contracts"
          filename: "#{truffle_dir}/example/contracts/Example.sol"
          name: "Example"
          variable: "example"
        test:
          directory: "#{truffle_dir}/example/test"
          filename: "#{truffle_dir}/example/test/example.coffee" 
      contracts:
        classes: {}
        directory: "#{working_dir}/contracts"
      tests:
        directory: "#{working_dir}/test"
      build:
        directory: "#{working_dir}/build"
        defaults:
          "post-process":
            "app.js": [
              "inject-contracts"
              "frontend-dependencies"
            ]
      dist:
        directory: "#{working_dir}/dist"
        defaults:
          "post-process":
            "app.js": [
              "inject-contracts"
              "frontend-dependencies"
              "uglify"
            ]
      processors:
        ".html": "#{truffle_dir}/lib/processors/html.coffee"
        ".js": "#{truffle_dir}/lib/processors/js.coffee"
        ".coffee": "#{truffle_dir}/lib/processors/coffee.coffee"
        ".css": "#{truffle_dir}/lib/processors/css.coffee"
        ".scss": "#{truffle_dir}/lib/processors/scss.coffee"
        "null": "#{truffle_dir}/lib/processors/null.coffee"
        "uglify": "#{truffle_dir}/lib/processors/post/uglify.coffee"
        "frontend-dependencies": "#{truffle_dir}/lib/processors/post/frontend_dependencies.coffee"
        "inject-contracts": "#{truffle_dir}/lib/processors/post/inject_contracts.coffee"
    
    desired_environment = grunt.option("e") || grunt.option("environment") || process.env.NODE_ENV || desired_environment

    # Try to find the desired environment, and fall back to development if we don't find it.
    for environment in [desired_environment, "development"]
      environment_directory = "#{config.environments.directory}/#{environment}"
      continue if !fs.existsSync(environment_directory)
      
      if environment != desired_environment
        console.log "Warning: Couldn't find environment #{desired_environment}."

      config.environment = desired_environment
      config.environments.current.directory = environment_directory
      config.environments.current.filename = "#{environment_directory}/config.json"
      config.environments.current.contracts_filename = "#{environment_directory}/contracts.json"

      break

    if !config.environment? and desired_environment?
      console.log "Couldn't find any suitable environment. Check environment configuration."
      process.exit(1)

    # Get environments in working directory, if available.
    if fs.existsSync(config.environments.directory)
      for directory in subdirSync(config.environments.directory)
        name = directory.substring(directory.lastIndexOf("/") + 1)
        config.environments.available[name] = directory

    # Load the app config.
    if fs.existsSync(config.app.configfile)
      config.app.resolved = loadconf(config.app.configfile, config.app.resolved)

    # Now overwrite any values from the environment config.
    if fs.existsSync(config.environments.current.filename)
      config.app.resolved = loadconf(config.environments.current.filename, config.app.resolved)

    # Helper function for expecting paths to exist.
    config.expect = (path, description, extra="") ->
      if !fs.existsSync(path)
        display_path = "." + path.replace(@working_dir, "")
        console.log "Couldn't find #{description} at #{display_path}. #{extra}"
        process.exit(1) 

    # Find the processors and then turn them into executable functions.
    for extension, file of config.processors
      config.processors[extension] = require(file)

    for extension, file of config.app.resolved.processors
      full_path = "#{working_dir}/#{file}"
      extension = extension.toLowerCase()
      config.expect(full_path, "specified .#{extension} processor", "Check your app config.")
      config.processors[extension] = require(full_path)

    # Evaluate frontend targets, making the configuration conform, adding 
    # default post processing, if any.
    for target, options of config.app.resolved.frontend
      if typeof options == "string"
        options = [options]

      if options instanceof Array
        options = {
          files: options
          "post-process": 
            build: []
            dist: []
        }

      options["post-process"] = {build: [], dist: []} if !options["post-process"]?

      # Check for default post processing for this target,
      # and add it if the target hasn't specified any post processing.
      for key in ["build", "dist"]
        if config[key].defaults["post-process"][target]? and options["post-process"][key].length == 0
          options["post-process"][key] = config[key].defaults["post-process"][target]

      config.app.resolved.frontend[target] = options

    # Get contracts in working directory, if available.
    if fs.existsSync(config.contracts.directory)
      for file in filesSync(config.contracts.directory)
        name = file.substring(file.lastIndexOf("/") + 1, file.lastIndexOf("."))
        config.contracts.classes[name] = {
          source: file
        }

    # Now merge those contracts with what's in the configuration, if any.
    if fs.existsSync(config.environments.current.contracts_filename)
      for name, contract of loadconf(config.environments.current.contracts_filename)
        # Don't import any deleted contracts.
        continue if !fs.existsSync(contract.source)
        config.contracts.classes[name] = contract

    config.provider = new web3.providers.HttpProvider("http://#{config.app.resolved.rpc.host}:#{config.app.resolved.rpc.port}")
    web3.setProvider(config.provider)

    if grunt.option("verbose-rpc")?
      # # If you want to see what web3 is sending and receiving.
      oldAsync = config.provider.sendAsync
      config.provider.sendAsync = (options, callback) ->
        console.log "   > " + JSON.stringify(options, null, 2).split("\n").join("\n   > ")
        oldAsync.call config.provider, options, (error, result) ->
          if !error?
            console.log " <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   ")
          callback(error, result)

    return config

  

module.exports = Config