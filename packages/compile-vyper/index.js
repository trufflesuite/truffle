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
function execVyper(options, sourcePath, callback) {
  const formats = ["abi", "bytecode", "bytecode_runtime"];
  if (
    options.compilers.vyper.settings &&
    options.compilers.vyper.settings.sourceMap
  ) {
    formats.push("source_map");
  }
  let evmVersionOption = "";
  if (
    options.compilers.vyper.settings &&
    options.compilers.vyper.settings.evmVersion
  ) {
    const evmVersion = options.compilers.vyper.settings.evmVersion;
    if (evmVersion.includes("'")) {
      throw new Error("Invalid EVM version");
    }
    evmVersionOption = `--evm-version '${evmVersion}'`;
  }
  const command = `vyper -f ${formats.join(
    ","
  )} ${evmVersionOption} ${sourcePath}`;

  exec(command, { maxBuffer: 600 * 1024 }, function (err, stdout, stderr) {
    if (err)
      return callback(
        `${stderr}\n${colors.red(
          `Compilation of ${sourcePath} failed. See above.`
        )}`
      );

    var outputs = stdout.split(/\r?\n/);

    const compiledContract = outputs.reduce((contract, output, index) => {
      return Object.assign(contract, { [formats[index]]: output });
    }, {});

    callback(null, compiledContract);
  });
}

/**
 *
 * read source contents from sourcePath
 */
function readSource(sourcePath) {
  const sourceBuffer = fs.readFileSync(sourcePath);
  return sourceBuffer.toString();
}

/**
 * aggregate source information based on compiled output;
 * this can include sources that are not contracts
 */
function processAllSources(sources) {
  if (!sources.length) return [];

  return sources.map(sourcePath => {
    let source = {
      sourcePath: sourcePath,
      contents: readSource(sourcePath),
      language: "vyper"
    };

    return source;
  });
}

// compile all sources
async function compileAll({ sources, options }) {
  options.logger = options.logger || console;

  Compile.display(sources, options);

  const promises = [];
  sources.forEach(sourcePath => {
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

          const sourceContents = readSource(sourcePath);

          const contractDefinition = {
            contractName: contractName,
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
  return {
    compilations: [
      {
        sources: processAllSources(sources),
        compiler: compilerInfo,
        contracts,
        sourceIndexes: sources
      }
    ]
  };
}

const Compile = {
  // Check that vyper is available then forward to internal compile function
  async sources({ sources = [], options }) {
    // filter out non-vyper paths
    const vyperFiles = sources.filter(path => minimatch(path, VYPER_PATTERN));

    // no vyper files found, no need to check vyper
    if (vyperFiles.length === 0) {
      return { compilations: [] };
    }

    await checkVyper();
    return await compileAll({
      sources: vyperFiles,
      options
    });
  },

  async sourcesWithDependencies({ paths = [], options }) {
    return await Compile.sources({
      sources: paths,
      options
    });
  },

  // contracts_directory: String. Directory where contract files can be found.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  async all(options) {
    const fileSearchPattern = path.join(
      options.contracts_directory,
      VYPER_PATTERN
    );
    const files = await findContracts(fileSearchPattern);

    return await Compile.sources({
      sources: files,
      options
    });
  },

  // contracts_directory: String. Directory where contract files can be found.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  async necessary(options) {
    options.logger = options.logger || console;
    const updated = await Profiler.updated(options);

    if (updated.length === 0 && options.quiet !== true) {
      return { compilations: [] };
    }

    // filter out only Vyper files
    const updatedVyperPaths = updated.filter(path => {
      return path.match(/\.vy$|\.v.py$|\.vyper.py$/);
    });
    return await Compile.sources({
      sources: updatedVyperPaths,
      options
    });
  },

  async display(paths, options) {
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
    options.events.emit("compile:sourcesToCompile", { sourceFileNames });
  }
};

module.exports = {
  Compile
};
