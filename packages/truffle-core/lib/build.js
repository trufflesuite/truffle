var async = require("async");
var mkdirp = require("mkdirp");
var del = require("del");
var fs = require("fs");
var DefaultBuilder = require("truffle-default-builder");
var Contracts = require("./contracts");
var BuildError = require("./errors/builderror");
var child_process = require("child_process");
var spawnargs = require("spawn-args");
var _ = require("lodash");
var expect = require("./expect");

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
      BUILD_CONTRACTS_DIRECTORY: options.contracts_build_directory,
      WEB3_PROVIDER_LOCATION: "http://" + options.rpc.host + ":" + options.rpc.port
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
      "builder",
      "build_directory",
      "working_directory",
      "contracts_build_directory",
      "network",
      "network_id",
      "provider",
      "rpc"
    ]);

    var key = "build";

    if (options.dist) {
      key = "dist";
    }

    var logger = options.logger || console;
    var builder = options.builder;

    // No builder specified. Ignore the build then.
    if (typeof builder == "undefined") {
      if (options.quiet != true) {
        logger.log("No build configuration specified. Not building.");
      }
      return callback();
    }

    if (typeof builder == "string") {
      builder = new CommandBuilder(builder);
    } else if (typeof builder !== "function") {
      // If the builder's an object and it doesn't have
      // a proper build function, then assume it's configuration
      // for the default builder.
      if (builder.hasOwnProperty("build") == false || typeof builder.build !== "function") {
        builder = new DefaultBuilder(builder, key, options.processors);
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

        Contracts.provision(options, false, function(err, contracts) {
          if (err) return callback(err);

          var resolved_options = {
            working_directory: options.working_directory,
            contracts: contracts,
            contracts_build_directory: options.contracts_build_directory,
            destination_directory: options.build_directory,
            rpc: options.rpc,
            provider: options.provider,
            network: options.network
          };

          builder.build(resolved_options, function(err) {
            if (!err) return callback();

            if (typeof err == "string") {
              err = new BuildError(err);
            }

            callback(err);
          });
        });
      });
    });
  },

  // Deprecated: Specific to default builder.
  dist: function(config, callback) {
    this.build(config, "dist", callback);
  }
}

module.exports = Build;
