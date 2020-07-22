import path from "path";
import { version } from "../package.json";
import { readFileSync } from "fs";
import minimatch from "minimatch";

import find_contracts from "@truffle/contract-sources";
import Profiler from "@truffle/compile-solidity/profiler";
import TruffleConfig from "@truffle/config";

const compiler = {
  name: "@truffle/compile-michelson",
  version: `${version}`
};

const MICHELSON_PATTERN = "**/*.tz";

// -------- TODO: Common with truffle-compile --------

type CompileCallback = (
  error?: any,
  result?: any,
  contractPaths?: Array<string>,
  _compiler?: typeof compiler
) => void;

const compile: any = {};

// contracts_directory: String. Directory where .tz files can be found.
// quiet: Boolean. Suppress output. Defaults to false.
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

// contracts_directory: String. Directory where .tz files can be found.
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
  { quiet, working_directory, logger }: TruffleConfig
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
  }
};

// -------- End of common with truffle-compile --------

// compile all options.paths
function compileAll(options: TruffleConfig, callback: CompileCallback) {
  const callbackPassed = typeof callback === "function";
  options.logger = options.logger || console;

  compile.display(options.paths, options);
  let contracts = [];

  for (const sourcePath of options.paths) {
    // remove extension from filename
    const extension = path.extname(sourcePath);
    const basename = path.basename(sourcePath, extension);

    const contractName = basename;

    const sourceBuffer = readFileSync(sourcePath);
    const sourceContents = sourceBuffer.toString();

    const contractDefinition = {
      contractName,
      abi: [], // TEMP!
      sourcePath,
      source: sourceContents,
      michelson: sourceContents,
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

// Filter .tz files then forward to internal compile function
function compileMichelson(options: TruffleConfig, callback: CompileCallback) {
  // filter out non-.tz paths
  options.paths = options.paths.filter((path: string) =>
    minimatch(path, MICHELSON_PATTERN)
  );

  // no .tz files found, no need to call `compileAll`
  if (options.paths.length === 0) return callback(null, {}, []);

  return compileAll(options, callback);
}

// append .tz pattern to contracts_directory in options and return updated options
function updateContractsDirectory(options: TruffleConfig) {
  return options.with({
    contracts_directory: path.join(
      options.contracts_directory,
      MICHELSON_PATTERN
    )
  });
}

// wrapper for compile.all. only updates contracts_directory to find .tz
compileMichelson.all = (options: TruffleConfig, callback: CompileCallback) =>
  compile.all(updateContractsDirectory(options), callback);

// wrapper for compile.necessary. only updates contracts_directory to find .tz
compileMichelson.necessary = (
  options: TruffleConfig,
  callback: CompileCallback
) => compile.necessary(updateContractsDirectory(options), callback);

compile.with_dependencies = compileMichelson;
export = compileMichelson;
module.exports = compileMichelson;
