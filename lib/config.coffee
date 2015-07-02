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
  @gather: (truffle_dir, working_dir, grunt) ->
    config = {}
    config = _.merge config, 
      grunt: grunt
      truffle_dir: truffle_dir
      working_dir: working_dir
      environment: process.env.NODE_ENV || grunt.option("e") || grunt.option("environment") || "development"
      environments: 
        directory: "#{working_dir}/config"
        available: {}
        current: {}       
      app:
        configfile: "#{working_dir}/config/app.json"
        # Default config objects that'll be overwritten by working_dir config.
        javascripts: []
        stylesheets: []
        deploy: []
        rpc: {}
        processors: {}
      javascripts: 
        directory: "#{working_dir}/app/javascripts"
        contract_inserter_filename: "#{truffle_dir}/lib/insert_contracts.coffee"
        frontend_includes: [
          "#{truffle_dir}/node_modules/bluebird/js/browser/bluebird.js"
          "#{truffle_dir}/node_modules/web3/dist/web3.min.js"
          "#{truffle_dir}/node_modules/ether-pudding/build/ether-pudding.js"
        ]
      stylesheets: 
        directory: "#{working_dir}/app/stylesheets"
      html: 
        filename: "#{working_dir}/app/index.html"
      assets:
        directory: "#{working_dir}/app/assets"
      example:
        directory: "#{truffle_dir}/example"
        contract:
          directory: "#{truffle_dir}/example/app/contracts"
          filename: "#{truffle_dir}/example/app/contracts/Example.sol"
          name: "Example"
          variable: "example"
        test:
          directory: "#{truffle_dir}/example/test"
          filename: "#{truffle_dir}/example/test/example.coffee" 
      contracts:
        classes: {}
        directory: "#{working_dir}/app/contracts"
      tests:
        directory: "#{working_dir}/test"
      build:
        directory: "#{working_dir}/build"
        javascript_filename: "#{working_dir}/build/app.js"
        stylesheet_filename: "#{working_dir}/build/app.css"
        html_filename: "#{working_dir}/build/index.html"
        assets:
          directory: "#{working_dir}/build/assets"
      dist:
        directory: "#{working_dir}/dist"
        javascript_filename: "#{working_dir}/dist/app.js"
        stylesheet_filename: "#{working_dir}/dist/app.css"
        html_filename: "#{working_dir}/dist/index.html"
        assets:
          directory: "#{working_dir}/dist/assets"
      processors:
        js: "#{truffle_dir}/lib/processors/js.coffee"
        coffee: "#{truffle_dir}/lib/processors/coffee.coffee"
        css: "#{truffle_dir}/lib/processors/css.coffee"
        scss: "#{truffle_dir}/lib/processors/scss.coffee"
    
    config.environments.current.directory = "#{config.environments.directory}/#{config.environment}"
    config.environments.current.filename = "#{config.environments.current.directory}/config.json"
    config.environments.current.contracts_filename = "#{config.environments.current.directory}/contracts.json"

    # Get environments in working directory, if available.
    if fs.existsSync(config.environments.directory)
      for directory in subdirSync(config.environments.directory)
        name = directory.substring(directory.lastIndexOf("/") + 1)
        config.environments.available[name] = directory

    # Load the app config.
    if fs.existsSync(config.app.configfile)
      config.app = loadconf(config.app.configfile, config.app)

    # Now overwrite any values from the environment config.
    if fs.existsSync(config.environments.current.filename)
      config.app = loadconf(config.environments.current.filename, config.app)

    # Helper function for expecting paths to exist.
    config.expect = (path, description, extra="") ->
      if !fs.existsSync(path)
        display_path = "." + path.replace(@working_dir, "")
        console.log "Couldn't find #{description} at #{display_path}. #{extra}"
        process.exit(1) 

    # Find the processors and then turn them into executable functions.
    for extension, file of config.processors
      config.processors[extension] = require(file)

    for extension, file of config.app.processors
      full_path = "#{working_dir}/#{file}"
      extension = extension.toLowerCase()
      config.expect(full_path, "specified .#{extension} processor", "Check your app config.")
      config.processors[extension] = require(full_path)

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

    config.provider = new web3.providers.HttpProvider("http://#{config.app.rpc.host}:#{config.app.rpc.port}")


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