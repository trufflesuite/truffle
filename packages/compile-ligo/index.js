const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

const async = require("async");
const colors = require("colors");
const minimatch = require("minimatch");

const Common = require("@truffle/compile-common");

const compiler = {
  name: "ligo",
  version: "next"
};

const LIGO_PATTERN = "**/*.{ligo,mligo}";

// -------- Pass Common helpers --------

const compile = { ...Common };

// -------- Start of compile-ligo specific methods --------

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
  const command = `docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-contract ${sourcePath} ${entryPoint}`;

  exec(command, { maxBuffer: 600 * 1024 }, (err, stdout, stderr) => {
    if (err)
      return callback(
        `${stderr}\n${colors.red(
          `Compilation of ${sourcePath} failed. See above.`
        )}`
      );

    const output = stdout.trim();
    const compiledContract = output.match(/{([^]*)}/)[1].trim();

    callback(null, compiledContract);
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
          code: compiledContract,
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
  compile.all(compile, updateContractsDirectory(options), callback);

// wrapper for compile.necessary. only updates contracts_directory to find .ligo
compileLigo.necessary = (options, callback) =>
  compile.necessary(compile, updateContractsDirectory(options), callback);

compile.with_dependencies = compileLigo;
module.exports = compileLigo;
