const debug = require("debug")("compile:legacy"); // eslint-disable-line no-unused-vars
const path = require("path");
const expect = require("@truffle/expect");
const Common = require("@truffle/compile-common");
const Config = require("@truffle/config");
const Profiler = require("../profiler");
const CompilerSupplier = require("../compilerSupplier");
const { run } = require("../run");
const { normalizeOptions } = require("./options");
const { shimOutput } = require("./shims");

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
const compile = function(sources, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  // account for legacy settings
  options = normalizeOptions(options);

  run(sources, options)
    .then(shimOutput)
    .then(([...returnVals]) => callback(null, ...returnVals))
    .catch(callback);
};

compile.all = Common.all;

compile.necessary = Common.necessary;

compile.with_dependencies = function(options, callback) {
  var self = this;

  options.logger = options.logger || console;
  options.contracts_directory = options.contracts_directory || process.cwd();

  expect.options(options, [
    "paths",
    "working_directory",
    "contracts_directory",
    "resolver"
  ]);

  var config = Config.default().merge(options);

  Profiler.required_sources(
    config.with({
      paths: options.paths,
      base_path: options.contracts_directory,
      resolver: options.resolver
    }),
    (err, allSources, required) => {
      if (err) return callback(err);

      var hasTargets = required.length;

      hasTargets
        ? self.display(required, options)
        : self.display(allSources, options);

      options.compilationTargets = required;
      compile(allSources, options, callback);
    }
  );
};

compile.display = function(paths, options) {
  if (options.quiet !== true) {
    if (!Array.isArray(paths)) {
      paths = Object.keys(paths);
    }

    const blacklistRegex = /^truffle\//;

    paths.sort().forEach(contract => {
      if (path.isAbsolute(contract)) {
        contract =
          "." + path.sep + path.relative(options.working_directory, contract);
      }
      if (contract.match(blacklistRegex)) return;
      options.logger.log("> Compiling " + contract);
    });
  }
};

compile.CompilerSupplier = CompilerSupplier;
module.exports = compile;
