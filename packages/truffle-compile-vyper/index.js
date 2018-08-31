const path = require('path');
const exec = require('child_process').exec;

const async = require('async');
const colors = require('colors');

const compiler = {
  name: 'vyper',
  version: null
};

// Check that vyper is available, save it's version
function checkVyper(callback) {
  exec('vyper --version', function (err, stdout, stderr) {
    if (err) return callback(`${colors.red('Error executing vyper:')}\n${stderr}`);

    compiler.version = stdout.trim();

    callback(null);
  });
}

// Execute vyper for single source file
function execVyper(source_path, callback) {
  // we need to execute compile with separate calls,
  // as vyper does not guarantee output order
  const commands = {
    abi: `vyper -f abi ${source_path}`,
    bytecode: `vyper -f bytecode ${source_path}`,
    bytecode_runtime: `vyper -f bytecode_runtime ${source_path}`
  };

  async.mapValues(commands, function (command, key, c) {
    exec(command, function (err, stdout, stderr) {
      if (err) return c(`${stderr}\n${colors.red('Compilation failed. See above.')}`);

      c(null, stdout.trim());
    });
  }, callback);
}

function compile(options, callback) {
  options.logger = options.logger || console;

  async.map(options.paths, function (source_path, c) {
    execVyper(source_path, function (err, compiled_contract) {
      options.logger.log(`Compiling ${source_path}...`);

      if (err) return c(err);

      const contract_definition = {
        contract_name: path.basename(source_path, path.extname(source_path)),
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

    callback(null, result, []);
  });
}

// Check that vyper is available then forward to internal compile function
function compileVyper(options, callback) {
  checkVyper(function (err) {
    if (err) return callback(err);

    compile(options, callback);
  });
}

module.exports = compileVyper;
