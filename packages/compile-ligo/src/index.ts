import path from "path";
import { exec, spawn } from "child_process";
import { readFileSync } from "fs";

import colors from "colors";
import minimatch from "minimatch";

import find_contracts from "@truffle/contract-sources";
import Profiler from "@truffle/compile-solidity/profiler";
import TruffleConfig from "@truffle/config";

const compiler = {
  name: "ligo",
  version: "next"
};

const LIGO_PATTERN = "**/*.{ligo,mligo,religo}";

// -------- TODO: Common with truffle-compile --------

type CompileCallback = (
  error?: any,
  result?: any,
  contractPaths?: Array<string>,
  _compiler?: typeof compiler
) => void;

const compile: any = {};

// contracts_directory: String. Directory where .ligo files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.all = (options: TruffleConfig, callback: CompileCallback) => {
  find_contracts(
    options.contracts_directory,
    (err: Error, files: Array<string>) => {
      if (err) return callback(err);

      options.paths = files;
      compile.with_dependencies(options, callback);
    }
  );
};

// contracts_directory: String. Directory where .ligo files can be found.
// build_directory: String. Optional. Directory where .json files can be found. Only required if `all` is false.
// all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
//      in the build directory to see what needs to be compiled.
// quiet: Boolean. Suppress output. Defaults to false.
// strict: Boolean. Return compiler warnings as errors. Defaults to false.
compile.necessary = (options: TruffleConfig, callback: CompileCallback) => {
  options.logger = options.logger || console;

  Profiler.updated(options, (err: Error, updated: Array<string>) => {
    if (err) return callback(err);

    if (updated.length === 0 && options.quiet !== true) {
      return callback(null, {}, []);
    }

    options.paths = updated;
    compile.with_dependencies(options, callback);
  });
};

compile.display = (
  paths: Array<string>,
  { quiet, working_directory, logger }: TruffleConfig,
  entryPoint: string
) => {
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
function checkLigo(callback: CompileCallback) {
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
function execLigo(sourcePath: any, entryPoint: string) {
  return new Promise((resolve, reject) => {
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
        reject(
          `${stderr}\n${colors.red(
            `Compilation of ${sourcePath} failed. See above.`
          )}`
        );
      }

      const jsonContractOutput = stdout.trim();

      resolve(jsonContractOutput);
    });
  });
}

// compile all options.paths
async function compileAll(options: TruffleConfig, callback: CompileCallback) {
  const callbackPassed = typeof callback === "function";
  const entryPoint = options._[0] || "main";
  options.logger = options.logger || console;

  compile.display(options.paths, options, entryPoint);
  let contracts: Array<any> = [];

  for (const sourcePath of options.paths) {
    let compiledContract;
    try {
      compiledContract = await execLigo(sourcePath, entryPoint);
    } catch (error) {
      if (callbackPassed) return callback(error);
      throw error;
    }
    // remove extension from filename
    const extension = path.extname(sourcePath as string);
    const basename = path.basename(sourcePath as string, extension);

    const contractName = basename;

    const sourceBuffer = readFileSync(sourcePath as string);
    const sourceContents = sourceBuffer.toString();

    const contractDefinition = {
      contractName,
      abi: [], // TEMP!
      sourcePath,
      source: sourceContents,
      michelson: compiledContract,
      compiler
    };

    contracts.push(contractDefinition);
  }
  const result = contracts.reduce((result: any, contract: any) => {
    result[contract.contractName] = contract;

    return result;
  }, {});

  if (callbackPassed) return callback(null, result, options.paths, compiler);
  return { result, paths: options.paths, compiler };
}

// Check that ligo is available then forward to internal compile function
function compileLigo(options: TruffleConfig, callback: CompileCallback) {
  // filter out non-ligo paths
  options.paths = options.paths.filter((path: string) =>
    minimatch(path, LIGO_PATTERN)
  );

  // no ligo files found, no need to check ligo
  if (options.paths.length === 0) return callback(null, {}, []);

  checkLigo(err => {
    if (err) return callback(err);

    return compileAll(options, callback);
  });
}

// append .ligo pattern to contracts_directory in options and return updated options
function updateContractsDirectory(options: TruffleConfig) {
  return options.with({
    contracts_directory: path.join(options.contracts_directory, LIGO_PATTERN)
  });
}

// wrapper for compile.all. only updates contracts_directory to find .ligo
compileLigo.all = (options: TruffleConfig, callback: CompileCallback) =>
  compile.all(updateContractsDirectory(options), callback);

// wrapper for compile.necessary. only updates contracts_directory to find .ligo
compileLigo.necessary = (options: TruffleConfig, callback: CompileCallback) =>
  compile.necessary(updateContractsDirectory(options), callback);

compile.with_dependencies = compileLigo;
export = compileLigo;
module.exports = compileLigo;
