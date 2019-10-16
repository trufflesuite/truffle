const debug = require("debug")("compile:new"); // eslint-disable-line no-unused-vars
const { promisify } = require("util");
const expect = require("@truffle/expect");
const Common = require("@truffle/compile-common");
const findContracts = require("@truffle/contract-sources");
const Config = require("@truffle/config");
const Profiler = require("../profiler");
const CompilerSupplier = require("../compilerSupplier");
const { run } = require("../run");
const { normalizeOptions } = require("../legacy/options");

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
const compile = async function(sources, options) {
  return await run(sources, normalizeOptions(options));
};

// contracts_directory: String. Directory where .sol files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
// files: Array<String>. Explicit files to compile besides detected sources
compile.all = async function(options) {
  const paths = [
    ...new Set([
      ...(await promisify(findContracts)(options.contracts_directory)),
      ...(options.files || [])
    ])
  ];

  return await compile.with_dependencies(
    Config.default()
      .merge(options)
      .merge({ paths })
  );
};

// contracts_directory: String. Directory where .sol files can be found.
// build_directory: String. Optional. Directory where .sol.js files can be found. Only required if `all` is false.
// all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
//      in the build directory to see what needs to be compiled.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
// files: Array<String>. Explicit files to compile besides detected sources
compile.necessary = async function(options) {
  options.logger = options.logger || console;

  const paths = [
    ...new Set([
      ...(await promisify(Common.updatedFiles)(options)),
      ...(options.files || [])
    ])
  ];

  return await compile.with_dependencies(
    Config.default()
      .merge(options)
      .merge({ paths })
  );
};

compile.with_dependencies = async function(options) {
  options.logger = options.logger || console;
  options.contracts_directory = options.contracts_directory || process.cwd();

  expect.options(options, [
    "paths",
    "working_directory",
    "contracts_directory",
    "resolver"
  ]);

  var config = Config.default().merge(options);

  const { allSources, required } = await new Promise((accept, reject) => {
    Profiler.required_sources(
      config.with({
        paths: options.paths,
        base_path: options.contracts_directory,
        resolver: options.resolver
      }),
      (err, allSources, required) => {
        if (err) {
          return reject(err);
        }

        return accept({ allSources, required });
      }
    );
  });

  var hasTargets = required.length;

  hasTargets
    ? this.display(required, options)
    : this.display(allSources, options);

  options.compilationTargets = required;
  return await compile(allSources, options);
};

compile.display = Common.display;

compile.CompilerSupplier = CompilerSupplier;
module.exports = compile;
