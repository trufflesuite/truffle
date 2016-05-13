var solc = require("solc");
var path = require("path");
var fs = require("fs");
var async = require("async");
var Profiler = require("./profiler");
var CompileError = require("./errors/compileerror");

module.exports = {
  // source_directory: String. Directory where .sol files can be found.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile_all: function(options, callback) {
    var self = this;
    Profiler.all_contracts(options.source_directory, function(err, files) {
      options.files = files;
      self.compile_with_dependencies(options, callback);
    });
  },

  // source_directory: String. Directory where .sol files can be found.
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

      if (updated.length == 0 && config.quiet != true) {
        options.logger.log("No contracts updated; skipping compilation.");
        return callback();
      }

      options.files = updated;
      self.compile_with_dependencies(options, callback);
    });
  },

  // {
  //   files: [...],
  //   includes: {
  //     "Foo.sol": "contract Foo {}" // Example
  //   },
  //   source_directory: "..." // or process.cwd()
  //   strict: false,
  //   quiet: false
  //   logger: console
  // }
  compile: function(options, callback) {
    var files = options.files || [];
    var includes = options.includes || {};
    var logger = options.logger || console;
    var source_directory = options.source_directory || process.cwd();

    var sources = {};

    async.each(files, function(file, finished) {
      fs.readFile(file, "utf8", function(err, body) {
        if (err) return finished(err);
        sources[path.relative(source_directory, file)] = body;
        finished();
      });
    }, function() {
      Object.keys(includes).forEach(function(key) {
        sources[key] = includes[key];
      });

      var result = solc.compile({sources: sources}, 1);
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
    })
  },

  compile_with_dependencies: function(options, callback) {
    options.files = options.files || [];
    options.includes = options.includes || {};
    options.logger = options.logger || console;
    options.source_directory = options.source_directory || process.cwd();

    var self = this;
    Profiler.required_files(options.files, function(err, files) {
      if (err) return callback(err);

      files.sort().forEach(function(file) {
        if (options.quiet != true) {
          var relative = path.relative(options.source_directory, file)
          options.logger.log("Compiling " + relative + "...");
        }
      });

      options.files = files;

      self.compile(options, callback);
    });
  }
};
