web3 = require "web3"
Init = require "./lib/init"
Create = require "./lib/create"
Config = require "./lib/config"
Contracts = require "./lib/contracts"
Build = require "./lib/build"
Test = require "./lib/test"
Exec = require "./lib/exec"

truffle_dir = process.env.TRUFFLE_NPM_LOCATION
working_dir = process.env.TRUFFLE_WORKING_DIRECTORY

module.exports = (grunt) ->
  # Remove grunt header and footer output.
  grunt.log.header = () ->
  grunt.fail.report = () ->

  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')
    availabletasks: 
      tasks: 
        options:
          filter: 'exclude',
          tasks: ['availabletasks', 'default', 'list:after', 'deploy']
          descriptions:
            watch: 'Watch project for changes and rebuild app automatically'
          reporter: (options) ->
            heading = options.currentTask.name
            while heading.length < options.meta.longest
              heading += " "
            grunt.log.writeln("  #{heading} => #{options.currentTask.info}")
    watch: 
      build: 
        files: ["#{working_dir}/app/**/*", "#{working_dir}/config/**/*", "#{working_dir}/contracts/**/*"] 
        tasks: ["build"] 
        options: 
          interrupt: true
          spawn: false
          atBegin: true
                 

  grunt.loadNpmTasks 'grunt-available-tasks'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  grunt.registerTask 'list', "List all available tasks", () ->
    console.log "Truffle v#{grunt.config().pkg.version} - a development framework for Ethereum"
    console.log ""
    console.log "Usage: truffle [command] [options]"
    console.log ""
    console.log "Commands:"
    console.log ""
    grunt.task.run "availabletasks"
    grunt.task.run "list:after"

  grunt.registerTask 'list:after', "Hidden: Simply print a line after 'list' runs", () ->
    console.log ""

  grunt.registerTask 'version', "Show version number and exit", () ->
    console.log "Truffle v#{grunt.config().pkg.version}"

  grunt.registerTask 'init', "Initialize new Ethereum project, including example contracts and tests", () ->
    config = Config.gather(truffle_dir, working_dir, grunt)
    Init.all(config, @async())

  grunt.registerTask 'init:contracts', "Initialize default contracts directory", () ->
    config = Config.gather(truffle_dir, working_dir, grunt)
    Init.contracts(config, @async())

  grunt.registerTask 'init:config', "Initialize default project configuration", () ->
    config = Config.gather(truffle_dir, working_dir, grunt)
    Init.config(config, @async())
    
  grunt.registerTask 'init:tests', "Initialize tests directory structure and helpers", () ->
    config = Config.gather(truffle_dir, working_dir, grunt)
    Init.tests(config, @async())

  grunt.registerTask 'create:contract', "Create a basic contract", () ->
    config = Config.gather(truffle_dir, working_dir, grunt)
    try 
      if typeof grunt.option("name") != "string"
        console.log "Please specify --name. Example: truffle create:contract --name 'MyContract'"
      else
        Create.contract(config, grunt.option("name"), @async())
    catch e
      console.log e.stack

  grunt.registerTask 'create:test', "Create a basic test", () ->
    config = Config.gather(truffle_dir, working_dir, grunt)
    try 
      if typeof grunt.option("name") != "string"
        console.log "Please specify --name. Example: truffle create:test --name 'MyContract'"
      else
        Create.test(config, grunt.option("name"), @async())
    catch e
      console.log e.stack

  grunt.registerTask 'compile', "Compile contracts", () ->
    done = @async()
    config = Config.gather(truffle_dir, working_dir, grunt, "development")
    Contracts.compile_all config, done

  grunt.registerTask 'deploy', "Deploy contracts to the network", () ->
    done = @async()
    config = Config.gather(truffle_dir, working_dir, grunt, "development")

    console.log "Using environment #{config.environment}."

    Contracts.deploy config, (err) ->
      if err?
        done(err)
      else
        done()
        grunt.task.run("build")

  grunt.registerTask 'build', "Build development version of app; creates ./build directory", () ->
    done = @async()
    config = Config.gather(truffle_dir, working_dir, grunt, "development")

    # This one's a promise...
    Build.build(config).then(done).catch(done)

  grunt.registerTask 'dist', "Create distributable version of app (minified); creates ./dist directory", () ->
    done = @async()
    config = Config.gather(truffle_dir, working_dir, grunt, "production")

    console.log "Using environment #{config.environment}."

    # This one's a promise...
    Build.dist(config).then(done).catch(done)

  grunt.registerTask 'exec', "Execute a Coffee/JS file within truffle environment. Script *must* call process.exit() when finished.", () ->
    done = @async()
    config = Config.gather(truffle_dir, working_dir, grunt, "development")

    # Remove grunt's writeln function. We'll do all the output'ing.
    grunt.log.writeln = () ->

    if typeof grunt.option("file") != "string"
      console.log "Please specify --file option, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished."
      done()
      return

    Exec.file(config, grunt.option("file"))

  # Supported options:
  # --no-color: Disable color
  # More to come.
  grunt.registerTask 'test', "Run tests", () ->
    done = @async()
    config = Config.gather(truffle_dir, working_dir, grunt, "test")

    console.log "Using environment #{config.environment}."

    grunt.option("quiet-deploy", true)
    Test.run(config, done)

  grunt.registerTask 'default', ['list']