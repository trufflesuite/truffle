var async = require("async");
var Promise = require("bluebird");
var mkdirp = Promise.promisify(require("mkdirp"));
var rimraf = Promise.promisify(require("rimraf"));
var fs = require("fs");
var DefaultBuilder = require("truffle-default-builder");
var PuddingLoader = require("ether-pudding/loader");
var BuildError = require("./errors/builderror");
var child_process = require("child_process");
var spawnargs = require("spawn-args");
var _ = require("lodash");

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
      NODE_ENV: options.environment,
      BUILD_DESTINATION_DIRECTORY: options.destination_directory,
      BUILD_CONTRACTS_DIRECTORY: options.contracts_directory,
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
  clean: function(destination, callback) {
    // Clean first.
    rimraf(destination + '/*').then(function() {
      return mkdirp(destination);
    }).then(function() {
      callback();
    }).catch(callback);
  },

  get_contract_data: function(config, callback) {
    if (config.app.resolved.include_contracts === false) {
      return callback(null, []);
    }

    var warning = "Warning: No compiled contracts found. App will be built without compiled contracts.";

    if (fs.existsSync(config.contracts.build_directory) == false) {
      console.log(warning);
      callback(null, []);
    } else {
      PuddingLoader.contract_data(config.contracts.build_directory, function(err, contracts) {
        if (err) return callback(err);

        if (contracts.length == 0) {
          console.log(warning);
        }

        callback(null, contracts);
      });
    }
  },

  // Note: key is a legacy parameter that will eventually be removed.
  // It's specific to the default builder and we should phase it out.
  build: function(config, key, callback) {
    var self = this;

    if (typeof key == "function") {
      callback = key;
      key = "build";
    }

    var builder = config.app.resolved.build;

    // No builder specified. Ignore the build then.
    if (typeof builder == "undefined") {
      if (config.argv.quietDeploy == null) {
        console.log("No build configuration specified. Not building.");
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
        builder = new DefaultBuilder(config.app.resolved.build, key, config.app.resolved.processors);
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

    clean(config.build.directory, function(err) {
      if (err) return callback(err);

      self.get_contract_data(config, function(err, contracts) {
        if (err) return callback(err);

        var options = {
          working_directory: config.working_dir,
          contracts: contracts,
          contracts_directory: config.contracts.build_directory,
          rpc: config.app.resolved.rpc,
          environment: config.environment,
          destination_directory: config.build.directory,
        };

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
    this.build(config, "dist", callback);
  }
}

module.exports = Build;
