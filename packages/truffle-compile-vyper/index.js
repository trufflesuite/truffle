const path = require('path');
const exec = require('child_process').exec;

const async = require('async');
const colors = require('colors');
const minimatch = require('minimatch');

const find_contracts = require('truffle-contract-sources');
const Profiler = require('truffle-compile/profiler');

const compiler = {
  name: 'vyper',
  version: null,
};

const VYPER_PATTERN = '**/*.{vy,v.py,vyper.py}';

// -------- TODO: Common with truffle-compile --------

const compile = {};

// contracts_directory: String. Directory where .sol files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.all = function(options, callback) {

  find_contracts(options.contracts_directory, function(err, files) {
    if (err) return callback(err)

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
      return callback(null, [], {});
    }

    options.paths = updated;
    compile.with_dependencies(options, callback);
  });
};

compile.display = function(paths, options){
  if (options.quiet != true) {
    if (!Array.isArray(paths)){
      paths = Object.keys(paths);
    }

    paths.sort().forEach(contract => {
      if (path.isAbsolute(contract)) {
        contract = "." + path.sep + path.relative(options.working_directory, contract);
      }
      options.logger.log("Compiling " + contract + "...");
    });
  }
};

// -------- End of common with truffle-compile --------

// Check that vyper is available, save its version
function checkVyper(callback) {
  exec('vyper --version', function (err, stdout, stderr) {
    if (err) return callback(`${colors.red('Error executing vyper:')}\n${stderr}`);

    compiler.version = stdout.trim();

    callback(null);
  });
}

// Execute vyper for single source file
function execVyper(source_path, callback) {
  const formats = ['abi', 'bytecode', 'bytecode_runtime'];
  const command = `vyper -f${formats.join(',')} ${source_path}`;

  exec(command, function (err, stdout, stderr) {
    if (err) return callback(`${stderr}\n${colors.red(`Compilation of ${source_path} failed. See above.`)}`);

    outputs = stdout.split(/\n/);

    const compiled_contract = outputs.reduce(
      function (contract, output, index) {
        return Object.assign(contract, { [formats[index]]: output });
      },
      {}
    );

    callback(null, compiled_contract);
  });
}

// compile all options.paths
function compileAll(options, callback) {
  options.logger = options.logger || console;

  compile.display(options.paths, options);

  async.map(options.paths, function (source_path, c) {
    execVyper(source_path, function (err, compiled_contract) {
      if (err) return c(err);

      // remove first extension from filename
      const extension = path.extname(source_path);
      const basename = path.basename(source_path, extension);

      // if extension is .py, remove second extension from filename
      const contract_name = extension !== '.py' ? basename : path.basename(basename, path.extname(basename));

      const contract_definition = {
        contract_name: contract_name,
        sourcePath: source_path,

        abi: compiled_contract.abi,
        bytecode: compiled_contract.bytecode,
        deployedBytecode: compiled_contract.bytecode_runtime,

        compiler: compiler
      };

      c(null, contract_definition);
    });
  }, function (err, contracts) {
    if (err) return callback(err);

    const result = contracts.reduce(function(result, contract) {
      result[contract.contract_name] = contract;

      return result;
    }, {});

    callback(null, result, options.paths);
  });
}

// Check that vyper is available then forward to internal compile function
function compileVyper(options, callback) {
  // filter out non-vyper paths
  options.paths = options.paths.filter(function (path) {
    return minimatch(path, VYPER_PATTERN);
  });

  // no vyper files found, no need to check vyper
  if (options.paths.length === 0) return callback(null, {}, []);

  checkVyper(function (err) {
    if (err) return callback(err);

    return compileAll(options, callback);
  });
}

// append .vy pattern to contracts_directory in options and return updated options
function updateContractsDirectory(options) {
  return options.with({
    contracts_directory: path.join(options.contracts_directory, VYPER_PATTERN),
  });
}

// wrapper for compile.all. only updates contracts_directory to find .vy
compileVyper.all = function (options, callback) {
  return compile.all(updateContractsDirectory(options), callback);
};

// wrapper for compile.necessary. only updates contracts_directory to find .vy
compileVyper.necessary = function (options, callback) {
  return compile.necessary(updateContractsDirectory(options), callback);
};

compile.with_dependencies = compileVyper;
module.exports = compileVyper;
