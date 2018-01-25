var async = require("async");
var mkdirp = require("mkdirp");
var del = require("del");
var fs = require("fs");
var Contracts = require("truffle-workflow-compile");
var BuildError = require("./errors/builderror");
var child_process = require("child_process");
var spawnargs = require("spawn-args");
var _ = require("lodash");
var expect = require("truffle-expect");
var contract = require("truffle-contract");

function CommandBuilder(command) {
  this.command = command;
};

CommandBuilder.prototype.build = function(options, callback) {
  console.log("Running `" + this.command + "`...")

  var args = spawnargs(this.command);
  var ps = args.shift();

  var cmd = child_process.spawn(ps, args, {
    detached: false,
    cwd: options.working_directory,
    env: _.merge(process.env, {
      WORKING_DIRECTORY: options.working_directory,
      BUILD_DESTINATION_DIRECTORY: options.destination_directory,
      BUILD_CONTRACTS_DIRECTORY: options.contracts_build_directory
    })
  });

  cmd.stdout.on('data', function(data) {
    console.log(data.toString());
  });

  cmd.stderr.on('data', function(data) {
    console.log("build error: " + data);
  });

  cmd.on('close', function(code) {
    var error = null;
    if (code !== 0) {
      error = "Command exited with code " + code;
    }
    callback(error);
  });
};

var Build = {
  clean: function(options, callback) {

    var destination = options.build_directory;
    var contracts_build_directory = options.contracts_build_directory;

    // Clean first.
    del([destination + '/*', "!" + contracts_build_directory]).then(function() {
      mkdirp(destination, callback);
    });
  },

  // Note: key is a legacy parameter that will eventually be removed.
  // It's specific to the default builder and we should phase it out.
  build: function(options, callback) {
    var self = this;

    expect.options(options, [
      "build_directory",
      "working_directory",
      "contracts_build_directory",
      "networks"
    ]);

    var key = "build";

    if (options.dist) {
      key = "dist";
    }

    var logger = options.logger || console;
    var builder = options.build;

    // Duplicate build directory for legacy purposes
    options.destination_directory = options.build_directory;

    // No builder specified. Ignore the build then.
    if (typeof builder == "undefined") {
      if (options.quiet != true) {
        return callback(new BuildError("No build configuration specified. Can't build."));
      }
      return callback();
    }

    if (typeof builder == "string") {
      builder = new CommandBuilder(builder);
    } else if (typeof builder !== "function") {
      if (builder.build == null) {
        return callback(new BuildError("Build configuration can no longer be specified as an object. Please see our documentation for an updated list of supported build configurations."));
      }
    } else {
      // If they've only provided a build function, use that.
      builder = {
        build: builder
      };
    }

    // Use our own clean method unless the builder supplies one.
    var clean = this.clean;
    if (builder.hasOwnProperty("clean")) {
      clean = builder.clean;
    }

    clean(options, function(err) {
      if (err) return callback(err);

      // If necessary. This prevents errors due to the .sol.js files not existing.
      Contracts.compile(options, function(err) {
        if (err) return callback(err);

        builder.build(options, function(err) {
          if (!err) return callback();

          if (typeof err == "string") {
            err = new BuildError(err);
          }

          callback(err);
        });
      });
    });
  },

  // Deprecated: Specific to default builder.
  dist: function(config, callback) {
    this.build(config.with({
      key: "dist"
    }), callback);
  }
}

module.exports = Build;
