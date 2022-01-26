const debug = require("debug")("compile-vyper");
const path = require("path");
const exec = require("child_process").exec;
const fs = require("fs");
const colors = require("colors");
const minimatch = require("minimatch");
const semver = require("semver");

const findContracts = require("@truffle/contract-sources");
const Config = require("@truffle/config");
const { Profiler } = require("@truffle/profiler");
const { requiredSources } = require("./profiler");
const { Compilations } = require("@truffle/compile-common");

const { compileJson } = require("./vyper-json");

const VYPER_PATTERN_STRICT = "**/*.{vy,v.py,vyper.py}"; //no JSON

// Check that vyper is available, return its version
function checkVyper() {
  return new Promise((resolve, reject) => {
    exec("vyper-json --version", function (err, stdout, _stderr) {
      if (err) {
        //vyper-json not available, check vyper
        exec("vyper --version", function (err, stdout, stderr) {
          if (err) {
            //error: neither vyper nor vyper-json available
            return reject(`${colors.red("Error executing vyper:")}\n${stderr}`);
          }
          const version = normalizeVersion(stdout.trim());
          if (
            semver.satisfies(version, ">=0.2.5", {
              loose: true,
              includePrerelase: true
            })
          ) {
            //if version is >=0.2.5, we can still use JSON via
            //vyper --standard-json
            resolve({
              version,
              json: true,
              jsonCommand: "vyper --standard-json"
            });
          } else {
            //otherwise, we're stuck using vyper w/o JSON
            resolve({ version, json: false });
          }
        });
      } else {
        //no error: vyper-json is available
        const version = normalizeVersion(stdout.trim());
        resolve({ version, json: true, jsonCommand: "vyper-json" });
      }
    });
  });
}

//HACK: alters prerelease versions so semver can understand them
function normalizeVersion(version) {
  return version.replace(/^(\d+\.\d+\.\d+)b(\d+)/, "$1-beta.$2");
}

// Execute vyper for single source file
function execVyper(options, sourcePath, version, callback) {
  const formats = ["abi", "bytecode", "bytecode_runtime"];
  debug("version: %s", version);
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
  if (options.contracts_directory.includes("'")) {
    throw new Error("Contracts directory contains apostrophe");
  }
  const command = `vyper -f ${formats.join(
    ","
  )} ${evmVersionOption} ${sourcePath} -p '${options.contracts_directory}'`;

  exec(command, { maxBuffer: 600 * 1024 }, function (err, stdout, stderr) {
    if (err)
      return callback(
        `${stderr}\n${colors.red(
          `Compilation of ${sourcePath} failed. See above.`
        )}`
      );

    var outputs = stdout.split(/\r?\n/);

    debug("formats: %O", formats);
    debug("outputs: %O", outputs);

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

//note: this takes paths, rather than full source objects like compileJson!
async function compileNoJson({ paths: sources, options, version }) {
  const compiler = { name: "vyper", version };
  const promises = [];
  const properSources = sources.filter(source => !source.endsWith(".json")); //filter out JSON interfaces
  const targets = options.compilationTargets
    ? properSources.filter(sourcePath =>
        options.compilationTargets.includes(sourcePath)
      )
    : properSources;
  targets.forEach(sourcePath => {
    promises.push(
      new Promise((resolve, reject) => {
        execVyper(
          options,
          sourcePath,
          version,
          function (error, compiledContract) {
            if (error) return reject(error);

            debug("compiledContract: %O", compiledContract);

            // remove first extension from filename
            const extension = path.extname(sourcePath);
            const basename = path.basename(sourcePath, extension);

            // if extension is .py, remove second extension from filename
            const contractName =
              extension !== ".py"
                ? basename
                : path.basename(basename, path.extname(basename));

            const sourceContents = readSource(sourcePath);
            const deployedSourceMap = compiledContract.source_map //there is no constructor source map
              ? JSON.parse(compiledContract.source_map)
              : undefined;

            const contractDefinition = {
              contractName: contractName,
              sourcePath: sourcePath,
              source: sourceContents,
              abi: JSON.parse(compiledContract.abi),
              bytecode: {
                bytes: compiledContract.bytecode.slice(2), //remove "0x" prefix
                linkReferences: [] //no libraries in Vyper
              },
              deployedBytecode: {
                bytes: compiledContract.bytecode_runtime.slice(2), //remove "0x" prefix
                linkReferences: [] //no libraries in Vyper
              },
              deployedSourceMap,
              compiler
            };

            const compilation = {
              sources: [
                {
                  sourcePath,
                  contents: sourceContents,
                  language: "Vyper"
                }
              ],
              contracts: [contractDefinition],
              compiler,
              sourceIndexes: [sourcePath]
            };

            resolve(compilation);
          }
        );
      })
    );
  });
  const compilations = await Promise.all(promises);

  return Compilations.promoteCompileResult({ compilations });
}

const Compile = {
  // Check that vyper is available then forward to internal compile function
  async sources({ sources = {}, options }) {
    options = Config.default().merge(options);
    const paths = Object.keys(sources);
    const vyperFiles = paths.filter(path =>
      minimatch(path, VYPER_PATTERN_STRICT, { dot: true })
    );

    // no vyper files found, no need to check vyper
    // (note that JSON-only will not activate vyper)
    if (vyperFiles.length === 0) {
      return Compilations.emptyWorkflowCompileResult();
    }

    Compile.display(vyperFiles, options);
    const { version, json: useJson, jsonCommand } = await checkVyper();
    if (!useJson) {
      //it might be possible to handle this case by writing the sources
      //to a temporary directory (and possibly using some sort of remapping--
      //a manual one I mean, Vyper doesn't have remappings),
      //but for now I'll just have it throw for simplicity
      throw new Error("Compiling literal Vyper sources requires vyper-json");
    }

    return compileJson({ sources, options, version, command: jsonCommand });
  },

  async sourcesWithDependencies({ paths = [], options }) {
    options = Config.default().merge(options);
    debug("paths: %O", paths);
    const vyperFilesStrict = paths.filter(path =>
      minimatch(path, VYPER_PATTERN_STRICT, { dot: true })
    );
    debug("vyperFilesStrict: %O", vyperFilesStrict);

    // no vyper targets found, no need to check Vyper
    if (vyperFilesStrict.length === 0) {
      return Compilations.emptyWorkflowCompileResult();
    }

    const { allSources, compilationTargets } = await requiredSources(
      options.with({
        paths: vyperFilesStrict,
        base_path: options.contracts_directory,
        compiler: {
          name: "vyper"
          //HACK: we leave version empty because we haven't determined
          //it at this point and we don't want to pay the cost of doing
          //so, and nothing in the resolver sources currently uses
          //precise vyper version
        }
      })
    );

    debug("allSources: %O", allSources);
    debug("compilationTargets: %O", compilationTargets);
    const vyperTargets = compilationTargets.filter(path =>
      minimatch(path, VYPER_PATTERN_STRICT, { dot: true })
    );

    // no vyper targets found, no need to activate Vyper
    if (vyperTargets.length === 0) {
      return Compilations.emptyWorkflowCompileResult();
    }

    //having gotten the sources from the resolver, we invoke compileJson
    //ourselves, rather than going through Compile.sources()
    Compile.display(compilationTargets, options);

    const { version, json: useJson, jsonCommand } = await checkVyper();

    if (useJson) {
      return compileJson({
        sources: allSources,
        options: options.with({
          compilationTargets
        }),
        version,
        command: jsonCommand
      });
    } else {
      return await compileNoJson({
        paths: Object.keys(allSources),
        options: options.with({
          compilationTargets
        }),
        version
      });
    }
  },

  // contracts_directory: String. Directory where contract files can be found.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  async all(options) {
    options = Config.default().merge(options);
    const files = await findContracts(options.contracts_directory);

    const vyperFilesStrict = files.filter(path =>
      minimatch(path, VYPER_PATTERN_STRICT, { dot: true })
    );
    // no vyper targets found, no need to check Vyper
    if (vyperFilesStrict.length === 0) {
      return Compilations.emptyWorkflowCompileResult();
    }

    return await Compile.sourcesWithDependencies({
      paths: files,
      options
    });
  },

  // contracts_directory: String. Directory where contract files can be found.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  async necessary(options) {
    options = Config.default().merge(options);

    const profiler = await new Profiler({});
    const updated = await profiler.updated(options);
    if (updated.length === 0) {
      return Compilations.emptyWorkflowCompileResult();
    }
    return await Compile.sourcesWithDependencies({
      paths: updated,
      options
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
