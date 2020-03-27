const path = require("path");
const { exec, spawn } = require("child_process");
const fs = require("fs");

const async = require("async");
const colors = require("colors");
const minimatch = require("minimatch");

const find_contracts = require("@truffle/contract-sources");
const Profiler = require("@truffle/compile-solidity/profiler");

const compiler = {
  name: "ligo",
  version: "next"
};

const LIGO_PATTERN = "**/*.{ligo,mligo,religo}";

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
// build_directory: String. Optional. Directory where .json files can be found. Only required if `all` is false.
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

compile.display = (paths, { quiet, working_directory, logger }, entryPoint) => {
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
    logger.log(`> Using entry point "${entryPoint}"`);
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
function execLigo(sourcePath, entryPoint, callback) {
  // Note that the first volume parameter passed to docker needs to have a path
  // denoted in the format of of the host filesystem. The latter volume parameter,
  // as well as the entry point, needs to be denoted in the format of the VM.
  // Because of this, we rewrite the VM paths relative to a mounted volume called "project".

  // In order to make this work on all platforms, we first normalize every host path
  // (working directory, and source path). We then construct a VM internal sourch path,
  // using normalized working directory and source path. From there, we know this constructed
  // internal source path won't contain any "gotcha's", such as double-escaped path separators,
  // etc. From there, we replace all backslashes with forward slashes, which is the path
  // separator expected within the internal source.
  let currentWorkingDirectory = path.normalize(process.cwd());
  sourcePath = path.normalize(sourcePath);

  let fullInternalSourcePath = path
    .normalize("/project" + sourcePath.replace(currentWorkingDirectory, ""))
    .replace(/\\/g, "/");

  // Use spawn() instead of exec() here so that the OS can take care of escaping args.
  let docker = spawn("docker", [
    "run",
    "-v",
    currentWorkingDirectory + ":/project",
    "--rm",
    "-i",
    "ligolang/ligo:next",
    "compile-contract",
    "--michelson-format=json",
    fullInternalSourcePath,
    entryPoint
  ]);

  let stdout = "";
  let stderr = "";

  docker.stdout.on("data", data => {
    stdout += data;
  });

  docker.stderr.on("data", data => {
    stderr += data;
  });

  docker.on("close", code => {
    if (code != 0 || stderr != "") {
      return callback(
        `${stderr}\n${colors.red(
          `Compilation of ${sourcePath} failed. See above.`
        )}`
      );
    }

    const jsonContractOutput = stdout.trim();

    callback(null, jsonContractOutput);
  });
}

// compile all options.paths
function compileAll(options, callback) {
  const entryPoint = options._[0] || "main";
  options.logger = options.logger || console;

  compile.display(options.paths, options, entryPoint);

  async.map(
    options.paths,
    (sourcePath, c) => {
      execLigo(sourcePath, entryPoint, (err, compiledContract) => {
        if (err) return c(err);

        // remove extension from filename
        const extension = path.extname(sourcePath);
        const basename = path.basename(sourcePath, extension);

        const contractName = basename;

        const sourceBuffer = fs.readFileSync(sourcePath);
        const sourceContents = sourceBuffer.toString();

        const contractDefinition = {
          contractName,
          abi: [], // TEMP!
          sourcePath,
          source: sourceContents,
          michelson: compiledContract,
          compiler
        };

        c(null, contractDefinition);
      });
    },
    (err, contracts) => {
      if (err) return callback(err);

      const result = contracts.reduce((result, contract) => {
        result[contract.contractName] = contract;

        return result;
      }, {});

      callback(null, result, options.paths, compiler);
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
