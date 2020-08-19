const path = require("path");
const exec = require("child_process").exec;
const fs = require("fs");
const colors = require("colors");
const minimatch = require("minimatch");

const findContracts = require("@truffle/contract-sources");
const Profiler = require("@truffle/compile-solidity/profiler");

const compiler = {
  name: "vyper",
  version: null
};

const VYPER_PATTERN = "**/*.{vy,v.py,vyper.py}";

// -------- TODO: Common with @truffle/compile-solidity --------

const compile = {};

// contracts_directory: String. Directory where .sol files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.all = async function (options) {
  const files = await findContracts(options.contracts_directory);
  options.paths = files;
  return await compile.withDependencies(options);
};

// contracts_directory: String. Directory where .sol files can be found.
// build_directory: String. Optional. Directory where .sol.js files can be found. Only required if `all` is false.
// all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
//      in the build directory to see what needs to be compiled.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.necessary = async function (options) {
  options.logger = options.logger || console;

  return new Promise((resolve, reject) => {
    Profiler.updated(options, async function (err, updated) {
      if (err) {
        return reject(err);
      }

      if (updated.length === 0 && options.quiet !== true) {
        return resolve([]);
      }

      options.paths = updated;
      resolve(await compile.withDependencies(options));
    });
  });
};

compile.display = function (paths, options) {
  if (!Array.isArray(paths)) {
    paths = Object.keys(paths);
  }

  const sourceFileNames = paths.sort().map(contract => {
    if (path.isAbsolute(contract)) {
      return `.${path.sep}${path.relative(
        options.working_directory,
        contract
      )}`;
    }

    return contract;
  });
  options.events.emit("compile:sourcesToCompile", sourceFileNames);
};

// -------- End of common with @truffle/compile-solidity --------

// Check that vyper is available, save its version
function checkVyper() {
  return new Promise((resolve, reject) => {
    exec("vyper --version", function (err, stdout, stderr) {
      if (err) {
        return reject(`${colors.red("Error executing vyper:")}\n${stderr}`);
      }
      compiler.version = stdout.trim();
      resolve();
    });
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
  const command = `vyper -f ${formats.join(",")} ${source_path}`;

  exec(command, { maxBuffer: 600 * 1024 }, function (err, stdout, stderr) {
    if (err)
      return callback(
        `${stderr}\n${colors.red(
          `Compilation of ${source_path} failed. See above.`
        )}`
      );

    var outputs = stdout.split(/\r?\n/);

    const compiledContract = outputs.reduce((contract, output, index) => {
      return Object.assign(contract, { [formats[index]]: output });
    }, {});

    callback(null, compiledContract);
  });
}

// compile all options.paths
async function compileAll(options) {
  options.logger = options.logger || console;

  compile.display(options.paths, options);

  const promises = [];
  options.paths.forEach(sourcePath => {
    promises.push(
      new Promise((resolve, reject) => {
        execVyper(options, sourcePath, function (error, compiledContract) {
          if (error) return reject(error);

          // remove first extension from filename
          const extension = path.extname(sourcePath);
          const basename = path.basename(sourcePath, extension);

          // if extension is .py, remove second extension from filename
          const contractName =
            extension !== ".py"
              ? basename
              : path.basename(basename, path.extname(basename));

          const sourceBuffer = fs.readFileSync(sourcePath);
          const sourceContents = sourceBuffer.toString();

          const contractDefinition = {
            contract_name: contractName,
            sourcePath: sourcePath,
            source: sourceContents,
            abi: compiledContract.abi,
            bytecode: compiledContract.bytecode,
            deployedBytecode: compiledContract.bytecode_runtime,
            sourceMap: compiledContract.source_map,
            compiler
          };

          resolve(contractDefinition);
        });
      })
    );
  });
  const contracts = await Promise.all(promises);

  const compilerInfo = { name: "vyper", version: compiler.version };
  return [
    {
      compiler: compilerInfo,
      contracts,
      sourceIndexes: options.paths
    }
  ];
}

// Check that vyper is available then forward to internal compile function
async function compileVyper(options) {
  // filter out non-vyper paths
  options.paths = options.paths.filter(function (path) {
    return minimatch(path, VYPER_PATTERN);
  });

  // no vyper files found, no need to check vyper
  if (options.paths.length === 0) {
    return [];
  }

  await checkVyper();
  return await compileAll(options);
}

// append .vy pattern to contracts_directory in options and return updated options
function updateContractsDirectory(options) {
  return options.with({
    contracts_directory: path.join(options.contracts_directory, VYPER_PATTERN)
  });
}

// wrapper for compile.all. only updates contracts_directory to find .vy
compileVyper.all = function (options) {
  return compile.all(updateContractsDirectory(options));
};

// wrapper for compile.necessary. only updates contracts_directory to find .vy
compileVyper.necessary = function (options) {
  return compile.necessary(updateContractsDirectory(options));
};

compile.withDependencies = compileVyper;
module.exports = compileVyper;
