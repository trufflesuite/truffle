const path = require("path");
const exec = require("child_process").exec;
const fs = require("fs");

const async = require("async");
const colors = require("colors");
const minimatch = require("minimatch");

const Common = require("@truffle/compile-common");

const compiler = {
  name: "vyper",
  version: null
};

const VYPER_PATTERN = "**/*.{vy,v.py,vyper.py}";

// -------- Common helpers --------

const compile = {};

compile.all = Common.all;

compile.necessary = Common.necessary;

compile.display = Common.display;

// -------- End of Common helpers --------

// Check that vyper is available, save its version
function checkVyper(callback) {
  exec("vyper --version", function(err, stdout, stderr) {
    if (err)
      return callback(`${colors.red("Error executing vyper:")}\n${stderr}`);

    compiler.version = stdout.trim();

    callback(null);
  });
}

// Execute vyper for single source file
function execVyper(options, source_path, callback) {
  const formats = ["abi", "bytecode", "bytecode_runtime"];
  if (
    options.compilers.vyper.settings &&
    options.compilers.vyper.settings.sourceMap
  ) {
    formats.push("source_map");
  }
  const command = `vyper -f${formats.join(",")} ${source_path}`;

  exec(command, { maxBuffer: 600 * 1024 }, function(err, stdout, stderr) {
    if (err)
      return callback(
        `${stderr}\n${colors.red(
          `Compilation of ${source_path} failed. See above.`
        )}`
      );

    var outputs = stdout.split(/\r?\n/);

    const compiled_contract = outputs.reduce(function(contract, output, index) {
      return Object.assign(contract, { [formats[index]]: output });
    }, {});

    callback(null, compiled_contract);
  });
}

// compile all options.paths
function compileAll(options, callback) {
  options.logger = options.logger || console;

  compile.display(options.paths, options);

  async.map(
    options.paths,
    function(source_path, c) {
      execVyper(options, source_path, function(err, compiled_contract) {
        if (err) return c(err);

        // remove first extension from filename
        const extension = path.extname(source_path);
        const basename = path.basename(source_path, extension);

        // if extension is .py, remove second extension from filename
        const contract_name =
          extension !== ".py"
            ? basename
            : path.basename(basename, path.extname(basename));

        const source_buffer = fs.readFileSync(source_path);
        const source_contents = source_buffer.toString();

        const contract_definition = {
          contract_name: contract_name,
          sourcePath: source_path,
          source: source_contents,
          abi: compiled_contract.abi,
          bytecode: compiled_contract.bytecode,
          deployedBytecode: compiled_contract.bytecode_runtime,
          sourceMap: compiled_contract.source_map,

          compiler: compiler
        };

        c(null, contract_definition);
      });
    },
    function(err, contracts) {
      if (err) return callback(err);

      const result = contracts.reduce(function(result, contract) {
        result[contract.contract_name] = contract;

        return result;
      }, {});

      const compilerInfo = { name: "vyper", version: compiler.version };

      callback(null, result, options.paths, compilerInfo);
    }
  );
}

// Check that vyper is available then forward to internal compile function
function compileVyper(options, callback) {
  // filter out non-vyper paths
  options.paths = options.paths.filter(function(path) {
    return minimatch(path, VYPER_PATTERN);
  });

  // no vyper files found, no need to check vyper
  if (options.paths.length === 0) return callback(null, {}, []);

  checkVyper(function(err) {
    if (err) return callback(err);

    return compileAll(options, callback);
  });
}

// append .vy pattern to contracts_directory in options and return updated options
function updateContractsDirectory(options) {
  return options.with({
    contracts_directory: path.join(options.contracts_directory, VYPER_PATTERN)
  });
}

// wrapper for compile.all. only updates contracts_directory to find .vy
compileVyper.all = function(options, callback) {
  return compile.all(compile, updateContractsDirectory(options), callback);
};

// wrapper for compile.necessary. only updates contracts_directory to find .vy
compileVyper.necessary = function(options, callback) {
  return compile.necessary(
    compile,
    updateContractsDirectory(options),
    callback
  );
};

compile.with_dependencies = compileVyper;
module.exports = compileVyper;
