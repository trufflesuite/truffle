const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

const async = require("async");
const colors = require("colors");
const minimatch = require("minimatch");

const find_contracts = require("truffle-contract-sources");
const Profiler = require("truffle-compile/profiler");

const compiler = {
  name: "ligo"
};

const LIGO_PATTERN = "**/*.ligo";

// -------- TODO: Common with truffle-compile --------

const compile = {};

// contracts_directory: String. Directory where .ligo files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.all = (options, callback) => {
  find_contracts(options.contracts_directory, (err, files) => {
    if (err) return callback(err);

    options.paths = files;
    compile.with_dependencies(options, callback);
  });
};

// contracts_directory: String. Directory where .ligo files can be found.
// build_directory: String. Optional. Directory where .tz files can be found. Only required if `all` is false.
// all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
//      in the build directory to see what needs to be compiled.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.necessary = (options, callback) => {
  options.logger = options.logger || console;

  Profiler.updated(options, (err, updated) => {
    if (err) return callback(err);

    if (updated.length === 0 && options.quiet !== true) {
      return callback(null, [], {});
    }

    options.paths = updated;
    compile.with_dependencies(options, callback);
  });
};

compile.display = (paths, { quiet, working_directory, logger }) => {
  if (quiet !== true) {
    if (!Array.isArray(paths)) {
      paths = Object.keys(paths);
    }

    paths.sort().forEach(contract => {
      if (path.isAbsolute(contract)) {
        contract = `.${path.sep}${path.relative(working_directory, contract)}`;
      }
      logger.log(`> Compiling ${contract}`);
    });
  }
};

// -------- End of common with truffle-compile --------

// Check that ligo is available
function checkLigo(callback) {
  exec(
    "docker run --rm -i ligolang/ligo:next --help",
    (err, stdout, stderr) => {
      if (err)
        return callback(`${colors.red("Error executing ligo:")}\n${stderr}`);

      callback(null);
    }
  );
}

// Execute ligo for single source file
function execVyper({ compilers }, source_path, callback) {
  const formats = ["abi", "bytecode", "bytecode_runtime"];
  if (compilers.vyper.settings && compilers.vyper.settings.sourceMap) {
    formats.push("source_map");
  }
  const command = `vyper -f${formats.join(",")} ${source_path}`;

  exec(command, { maxBuffer: 600 * 1024 }, (err, stdout, stderr) => {
    if (err)
      return callback(
        `${stderr}\n${colors.red(
          `Compilation of ${source_path} failed. See above.`
        )}`
      );

    const outputs = stdout.split(/\r?\n/);

    const compiled_contract = outputs.reduce(
      (contract, output, index) =>
        Object.assign(contract, { [formats[index]]: output }),
      {}
    );

    callback(null, compiled_contract);
  });
}

// compile all options.paths
function compileAll(options, callback) {
  options.logger = options.logger || console;

  compile.display(options.paths, options);

  async.map(
    options.paths,
    (source_path, c) => {
      execVyper(
        options,
        source_path,
        (err, { abi, bytecode, bytecode_runtime, source_map }) => {
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
            contract_name,
            sourcePath: source_path,
            source: source_contents,
            abi: abi,
            bytecode: bytecode,
            deployedBytecode: bytecode_runtime,
            sourceMap: source_map,

            compiler
          };

          c(null, contract_definition);
        }
      );
    },
    (err, contracts) => {
      if (err) return callback(err);

      const result = contracts.reduce((result, contract) => {
        result[contract.contract_name] = contract;

        return result;
      }, {});

      const compilerInfo = { name: "vyper", version: compiler.version };

      callback(null, result, options.paths, compilerInfo);
    }
  );
}

// Check that ligo is available then forward to internal compile function
function compileLigo(options, callback) {
  // filter out non-ligo paths
  options.paths = options.paths.filter(path => minimatch(path, LIGO_PATTERN));

  // no ligo files found, no need to check ligo
  if (options.paths.length === 0) return callback(null, {}, []);

  checkLigo(err => {
    if (err) return callback(err);

    return compileAll(options, callback);
  });
}

// append .ligo pattern to contracts_directory in options and return updated options
function updateContractsDirectory(options) {
  return options.with({
    contracts_directory: path.join(options.contracts_directory, LIGO_PATTERN)
  });
}

// wrapper for compile.all. only updates contracts_directory to find .ligo
compileLigo.all = (options, callback) =>
  compile.all(updateContractsDirectory(options), callback);

// wrapper for compile.necessary. only updates contracts_directory to find .ligo
compileLigo.necessary = (options, callback) =>
  compile.necessary(updateContractsDirectory(options), callback);

compile.with_dependencies = compileLigo;
module.exports = compileLigo;
