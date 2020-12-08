const path = require("path");
const exec = require("child_process").exec;
const fs = require("fs");
const colors = require("colors");
const minimatch = require("minimatch");
const semver = require("semver");

const findContracts = require("@truffle/contract-sources");
const Profiler = require("@truffle/compile-solidity/profiler");

const { compileAllJson } = require("./vyper-json");

const VYPER_PATTERN = "**/*.{vy,v.py,vyper.py}";

// Check that vyper is available, return its version
function checkVyper() {
  return new Promise((resolve, reject) => {
    exec("vyper-json --version", function (err, stdout, _stderr) {
      if (err) {
        exec("vyper --version", function (err, stdout, stderr) {
          if (err) {
            return reject(`${colors.red("Error executing vyper:")}\n${stderr}`);
          }
          const version = stdout.trim();
          resolve({ version, json: false });
        });
      } else {
        const version = stdout.trim();
        resolve({ version, json: true });
      }
    });
  });
}

// Execute vyper for single source file
function execVyper(options, sourcePath, callback) {
  const formats = ["abi", "bytecode", "bytecode_runtime", "source_map"];
  if (
    semver.satisfies(version, ">=0.1.0-beta.7", {
      loose: true,
      includePrerelase: true
    })
  ) {
    //Vyper chokes on unknown formats, so only include this for
    //ones that support it (they were introduced in 0.1.0b7)
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

// compile all sources
async function compileAll({ sources, options, version, useJson }) {
  options.logger = options.logger || console;
  Compile.display(sources, options);
  if (useJson) {
    return compileAllJson({ sources, options, version });
  } else {
    return await compileAllNoJson({ sources, options, version });
  }
}

async function compileAllNoJson({ sources, options, version }) {
  const compiler = { name: "vyper", version };
  const promises = [];
  const targets = options.compilationTargets
    ? sources.filter(sourcePath =>
        options.compilationTargets.includes(sourcePath)
      )
    : sources;
  targets.forEach(sourcePath => {
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
            abi: JSON.parse(compiledContract.abi),
            bytecode: {
              bytes: compiledContract.bytecode,
              linkReferences: [] //no libraries in Vyper
            },
            deployedBytecode: {
              bytes: compiledContract.bytecode_runtime,
              linkReferences: [] //no libraries in Vyper
            },
            deployedSourceMap: JSON.parse(compiledContract.source_map), //there is no constructor source map
            compiler
          };

          const compilation = {
            sources: [
              {
                sourcePath,
                contents: sourceContents,
                language: "vyper"
              }
            ],
            contracts: [contractDefinition],
            compiler,
            sourceIndexes: [sourcePath]
          };

          resolve(compilation);
        });
      })
    );
  });
  const compilations = await Promise.all(promises);

  return { compilations };
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

    const { version, json } = await checkVyper();
    return await compileAll({
      sources: vyperFiles,
      options,
      version,
      useJson: json
    });
  },

  //since we don't have an imports analyzer for Vyper
  //yet, we'll just treat this the same as all; this will
  //need to be revisited once we have an import parser for Vyper
  async sourcesWithDependencies({ paths = [], options }) {
    return await Compile.all({ options });
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

    const fileSearchPattern = path.join(
      options.contracts_directory,
      VYPER_PATTERN
    );
    const files = await findContracts(fileSearchPattern);

    const updated = await Profiler.updated(options);
    if (updated.length === 0) {
      return { compilations: [] };
    }
    // select only Vyper files
    const updatedVyperPaths = updated.filter(path => {
      return path.match(/\.vy$|\.v.py$|\.vyper.py$/);
    });
    return await Compile.sources({
      sources: files,
      options: options.with({
        compilationTargets: updatedVyperPaths
      })
    });
  },

  async display(paths, options) {
    if (options.quiet !== true) {
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
  }
};

module.exports = {
  Compile
};
