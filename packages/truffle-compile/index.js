var Profiler = require("./profiler");
var OS = require("os");
var solc = require("solc");

// Clean up after solc.
var listeners = process.listeners("uncaughtException");
var solc_listener = listeners[listeners.length - 1];
process.removeListener("uncaughtException", solc_listener);

var path = require("path");
var fs = require("fs");
var async = require("async");
var Profiler = require("./profiler");
var CompileError = require("./compileerror");
var expect = require("truffle-expect");
var find_contracts = require("truffle-contract-sources");
var Config = require("truffle-config");

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
var compile = function(sources, options, callback) {
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
  var warnings = [];

  if (options.strict !== true) {
    warnings = errors.filter(function(error) {
      return error.indexOf("Warning:") >= 0;
    });

    errors = errors.filter(function(error) {
      return error.indexOf("Warning:") < 0;
    });

    if (options.quiet !== true && warnings.length > 0) {
      options.logger.log(OS.EOL + "Compilation warnings encountered:" + OS.EOL);
      options.logger.log(warnings.join());
    }
  }

  if (errors.length > 0) {
    options.logger.log("");
    return callback(new CompileError(result.errors.join()));
  }

  callback(null, result.contracts, Object.keys(operatingSystemIndependentSources));
};


// contracts_directory: String. Directory where .sol files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.all = function(options, callback) {
  var self = this;
  find_contracts(options.contracts_directory, function(err, files) {
    options.paths = files;
    compile.with_dependencies(options, callback);
  });
};

// contracts_directory: String. Directory where .sol files can be found.
// build_directory: String. Optional. Directory where .sol.js files can be found. Only required if `all` is false.
// all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
//      in the build directory to see what needs to be compiled.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.necessary = function(options, callback) {
  var self = this;
  options.logger = options.logger || console;

  Profiler.updated(options, function(err, updated) {
    if (err) return callback(err);

    if (updated.length == 0 && options.quiet != true) {
      return callback();
    }

    options.paths = updated;
    compile.with_dependencies(options, callback);
  });
};

compile.with_dependencies = function(options, callback) {
  options.logger = options.logger || console;
  options.contracts_directory = options.contracts_directory || process.cwd();

  expect.options(options, [
    "paths",
    "working_directory",
    "contracts_directory",
    "resolver"
  ]);

  var config = Config.default().merge(options);

  var self = this;
  Profiler.required_sources(config.with({
    paths: options.paths,
    base_path: options.contracts_directory,
    resolver: options.resolver
  }), function(err, result) {
    if (err) return callback(err);

    if (options.quiet != true) {
      Object.keys(result).sort().forEach(function(import_path) {
        var display_path = import_path;
        if (path.isAbsolute(import_path)) {
          display_path = "." + path.sep + path.relative(options.working_directory, import_path);
        }
        options.logger.log("Compiling " + display_path + "...");
      });
    }

    compile(result, options, callback);
  });
};

module.exports = compile;
