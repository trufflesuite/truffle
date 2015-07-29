var web3 = require("web3");
var Init = require("./lib/init");
var Create = require("./lib/create");
var Config = require("./lib/config");
var Contracts = require("./lib/contracts");
var Build = require("./lib/build");
var Test = require("./lib/test");
var Exec = require("./lib/exec");
var Repl = require("./lib/repl");

var truffle_dir = process.env.TRUFFLE_NPM_LOCATION;
var working_dir = process.env.TRUFFLE_WORKING_DIRECTORY;

module.exports = function(grunt) {
  // Remove grunt header and footer output.
  grunt.log.header = function() {}
  grunt.fail.report = function() {}

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    availabletasks: {
      tasks: {
        options: {
          filter: 'exclude',
          tasks: ['availabletasks', 'default', 'list:after', 'deploy'],
          descriptions: {
            watch: "Watch project for changes and rebuild app automatically"
          },
          reporter: function(options) {
            heading = options.currentTask.name
            while (heading.length < options.meta.longest) {
              heading += " ";
            }
            grunt.log.writeln("  " + heading + " => " + options.currentTask.info)
          }
        }
      }
    },
    watch: {
      build: {
        files: [working_dir + "/app/**/*", working_dir + "/config/**/*", working_dir + "/contracts/**/*"],
        tasks: ["build"],
        options: {
          interrupt: true,
          spawn: false,
          atBegin: true,
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-available-tasks');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('list', "List all available tasks", function() {
    console.log("Truffle v" + grunt.config().pkg.version + " - a development framework for Ethereum");
    console.log("");
    console.log("Usage: truffle [command] [options]");
    console.log("");
    console.log("Commands:");
    console.log("");
    grunt.task.run("availabletasks");
    grunt.task.run("list:after");
  });

  grunt.registerTask('list:after', "Hidden: Simply print a line after 'list' runs", function() {
    console.log("");
  });

  grunt.registerTask('version', "Show version number and exit", function() {
    console.log("Truffle v" + grunt.config().pkg.version);
  });

  grunt.registerTask('init', "Initialize new Ethereum project, including example contracts and tests", function() {
    var config = Config.gather(truffle_dir, working_dir, grunt);
    Init.all(config, this.async());
  });

  grunt.registerTask('init:contracts', "Initialize default contracts directory", function() {
    var config = Config.gather(truffle_dir, working_dir, grunt);
    Init.contracts(config, this.async());
  });

  grunt.registerTask('init:config', "Initialize default project configuration", function() {
    var config = Config.gather(truffle_dir, working_dir, grunt);
    Init.config(config, this.async());
  });

  grunt.registerTask('init:tests', "Initialize tests directory structure and helpers", function() {
    var config = Config.gather(truffle_dir, working_dir, grunt);
    Init.tests(config, this.async());
  });

  grunt.registerTask('create:contract', "Create a basic contract", function() {
    var config = Config.gather(truffle_dir, working_dir, grunt);
    try {
      if (typeof grunt.option("name") != "string") {
        console.log("Please specify --name. Example: truffle create:contract --name 'MyContract'");
      } else {
        Create.contract(config, grunt.option("name"), this.async());
      }
    } catch(e) {
      console.log(e.stack);
    }
  });

  grunt.registerTask('create:test', "Create a basic test", function() {
    var config = Config.gather(truffle_dir, working_dir, grunt);
    try {
      if (typeof grunt.option("name") != "string") {
        console.log("Please specify --name. Example: truffle create:test --name 'MyContract'");
      } else {
        Create.test(config, grunt.option("name"), this.async());
      }
    } catch(e) {
      console.log(e.stack);
    }
  });

  grunt.registerTask('compile', "Compile contracts", function() {
    var done = this.async();
    var config = Config.gather(truffle_dir, working_dir, grunt, "development");
    Contracts.compile(config, done);
  });

  grunt.registerTask('deploy', "Deploy contracts to the network", function() {
    var done = this.async();
    var config = Config.gather(truffle_dir, working_dir, grunt, "development");

    console.log("Using environment " + config.environment + ".");

    // Compile and deploy.
    Contracts.deploy(config, true, function(err) {
      if (err != null) {
        done(err);
      } else {
        done();
        grunt.task.run("build");
      }
    });
  });

  grunt.registerTask('build', "Build development version of app; creates ./build directory", function() {
    var done = this.async();
    var config = Config.gather(truffle_dir, working_dir, grunt, "development");

    // This one's a promise...
    Build.build(config).then(done).catch(done);
  });

  grunt.registerTask('dist', "Create distributable version of app (minified); creates ./dist directory", function() {
    var done = this.async();
    var config = Config.gather(truffle_dir, working_dir, grunt, "production");

    console.log("Using environment " + config.environment + ".");

    // This one's a promise...
    Build.dist(config).then(done).catch(done);
  });

  grunt.registerTask('exec', "Execute a Coffee/JS file within truffle environment. Script *must* call process.exit() when finished.", function() {
    var done = this.async();
    var config = Config.gather(truffle_dir, working_dir, grunt, "development");

    // Remove grunt's writeln function. We'll do all the output'ing.
    grunt.log.writeln = function() {}

    if (typeof grunt.option("file") != "string") {
      console.log("Please specify --file option, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished.");
      done();
      return;
    }

    Exec.file(config, grunt.option("file"));
  });

  // Supported options:
  // --no-color: Disable color
  // More to come.
  grunt.registerTask('test', "Run tests", function() {
    var done = this.async();
    var config = Config.gather(truffle_dir, working_dir, grunt, "test");

    console.log("Using environment " + config.environment + ".");

    grunt.option("quiet-deploy", true);
    Test.run(config, done);
  });

  grunt.registerTask('console', "Run a console with deployed contracts instanciated and available (REPL)", function() {
    var done = this.async();
    var config = Config.gather(truffle_dir, working_dir, grunt, "development");
    Repl.run(config, done);
  });

  grunt.registerTask('default', ['list']);
}
