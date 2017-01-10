var solc = require("solc");

// Clean up after solc.
var listeners = process.listeners("uncaughtException");
var solc_listener = listeners[listeners.length - 1];
process.removeListener("uncaughtException", solc_listener);

var path = require("path");
var fs = require("fs");
var async = require("async");
var Profiler = require("./profiler");
var CompileError = require("./errors/compileerror");
var Config = require("./config");
var expect = require("truffle-expect");

module.exports = {
  // contracts_directory: String. Directory where .sol files can be found.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile_all: function(options, callback) {
    var self = this;
    Profiler.all_contracts(options.contracts_directory, function(err, files) {
      options.paths = files;
      self.compile_with_dependencies(options, callback);
    });
  },

  // contracts_directory: String. Directory where .sol files can be found.
  // build_directory: String. Optional. Directory where .sol.js files can be found. Only required if `all` is false.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile_necessary: function(options, callback) {
    var self = this;
    options.logger = options.logger || console;

    Profiler.updated(options, function(err, updated) {
      if (err) return callback(err);

      if (updated.length == 0 && options.quiet != true) {
        return callback();
      }

      options.paths = updated;
      self.compile_with_dependencies(options, callback);
    });
  },

  // Most basic of the compile commands. Takes a hash of sources, where
  // the keys are file or module paths and the values are the bodies of
  // the contracts. Does not evaulate dependencies that aren't already given.
  //
  // Default options:
  // {
  //   strict: false,
  //   quiet: false,
  //   logger: console
  // }
  compile: function(sources, options, callback) {
    if (typeof options == "function") {
      callback = options;
      options = {};
    }

    if (options.logger == null) {
      options.logger = console;
    }

    // Ensure sources have operating system independent paths
    // i.e., convert backslashes to forward slashes; things like C: are left intact.
    var operatingSystemIndependentSources = {};

    Object.keys(sources).forEach(function(source) {
      var replacement = source.replace(/\\/g, "/");
      operatingSystemIndependentSources[replacement] = sources[source];
    });

    // Add the listener back in, just in case I need it.
    process.on("uncaughtException", solc_listener);

    var result = solc.compile({sources: operatingSystemIndependentSources}, 1);

    // Alright, now remove it.
    process.removeListener("uncaughtException", solc_listener);

    var errors = result.errors || [];
    var warnings = result.errors || [];

    if (options.strict == true) {
      errors = errors.filter(function(error) {
        return error.indexOf("Warning:") < 0;
      });
      warnings = warnings.filter(function(error) {
        return error.indexOf("Warning:") >= 0;
      });

      if (options.quiet != null) {
        warnings.forEach(function(warning) {
          logger.log(warning);
        });
      }
    }

    if (errors.length > 0) {
      return callback(new CompileError(result.errors.join()));
    }

    // Examine the sources, and ensure the contract we expected was defined
    // TODO: This forces contract names to be the same as their filename. This should go.
    var filenames = Object.keys(sources);
    for (var i = 0; i < filenames.length; i++) {
      var filename = filenames[i];
      var expected_contract = path.basename(filename, ".sol");

      if (result.contracts[expected_contract] == null) {
        return callback(new CompileError("Could not find expected contract or library in '" + filename + "': contract or library '" + expected_contract + "' not found."));
      }
    }

    callback(null, result.contracts);
  },

  compile_with_dependencies: function(options, callback) {
    options.logger = options.logger || console;
    options.contracts_directory = options.contracts_directory || process.cwd();

    // Use config object to ensure the default sources.
    var config = Config.default().merge(options);

    expect.options(config, [
      "paths",
      "sources"
    ]);

    var self = this;
    Profiler.required_sources(config.with({
      paths: config.paths,
      base_path: config.contracts_directory,
      sources: config.sources
    }), function(err, result) {
      if (err) return callback(err);

      if (config.quiet != true) {
        Object.keys(result).sort().forEach(function(import_path) {
          var display_path = import_path;
          if (path.isAbsolute(import_path)) {
            display_path = "." + path.sep + path.relative(config.working_directory, import_path);
          }
          config.logger.log("Compiling " + display_path + "...");
        });
      }

      self.compile(result, config, callback);
    });
  }
};
