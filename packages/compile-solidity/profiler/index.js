// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

const path = require("path");
const semver = require("semver");
const Parser = require("../parser");
const CompilerSupplier = require("../compilerSupplier");
const expect = require("@truffle/expect");
const findContracts = require("@truffle/contract-sources");
const debug = require("debug")("compile:profiler");
const Common = require("@truffle/compile-common");

module.exports = {
  async updated(options, callback) {
    const callbackPassed = typeof callback === "function";

    expect.options(options, ["resolver"]);

    const { contracts_directory, contracts_build_directory } = options;

    async function getFiles() {
      if (options.files) {
        return options.files;
      } else {
        return findContracts(contracts_directory);
      }
    }

    try {
      const updatedFiles = await Common.Profiler.updated({
        getFiles,
        contractsBuildDirectory: contracts_build_directory
      });

      if (callbackPassed) {
        callback(null, updatedFiles);
      } else {
        return updatedFiles;
      }
    } catch (error) {
      if (callbackPassed) {
        callback(error);
      } else {
        throw error;
      }
    }
  },

  // Returns the minimal set of sources to pass to solc as compilations targets,
  // as well as the complete set of sources so solc can resolve the comp targets' imports.
  required_sources(options, callback) {
    expect.options(options, ["paths", "base_path", "resolver"]);

    // Load compiler
    const supplierOptions = {
      parser: options.parser,
      events: options.events,
      solcConfig: options.compilers.solc
    };
    const supplier = new CompilerSupplier(supplierOptions);

    const resolver = options.resolver;
    // Fetch the whole contract set
    supplier
      .load()
      .then(async ({ solc, parserSolc }) => {
        const parserCompiler = parserSolc || solc;

        const {
          allSources,
          compilationTargets
        } = await Common.Profiler.requiredSources({
          updatedPaths: convertToAbsolutePaths(
            options.paths,
            options.base_path
          ),
          resolver,
          findContracts: async () => {
            const allPaths = await findContracts(options.contracts_directory);
            return convertToAbsolutePaths(allPaths, options.base_path);
          },
          shouldIncludePath: file => path.extname(file) !== ".vy",
          getImports: (current, result) =>
            getImports(current, result, parserCompiler)
        });

        callback(null, allSources, compilationTargets);
      })
      .catch(error => {
        callback(error);
      });
  }
};

function getImports(file, { body, source }, solc) {
  // No imports in vyper!
  if (path.extname(file) === ".vy") return [];

  try {
    const imports = Parser.parseImports(body, solc);

    // Convert explicitly relative dependencies of modules back into module paths.
    return imports.map(
      dependencyPath =>
        isExplicitlyRelative(dependencyPath)
          ? source.resolveDependencyPath(file, dependencyPath)
          : dependencyPath
    );
  } catch (err) {
    if (err.message.includes("requires different compiler version")) {
      const contractSolcPragma = err.message.match(/pragma solidity[^;]*/gm);
      // if there's a match provide the helpful error, otherwise return solc's error output
      if (contractSolcPragma) {
        const contractSolcVer = contractSolcPragma[0];
        const configSolcVer = semver.valid(solc.version());
        err.message = err.message.concat(
          `\n\nError: Truffle is currently using solc ${configSolcVer}, but one or more of your contracts specify "${contractSolcVer}".\nPlease update your truffle config or pragma statement(s).\n(See https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration for information on\nconfiguring Truffle to use a specific solc compiler version.)\n`
        );
      } else {
        err.message = `Error parsing ${currentFile}: ${err.message}`;
      }
    }

    throw err;
  }
}

function convertToAbsolutePaths(paths, base) {
  return paths
    .map(p => {
      // If it's anabsolute paths, leave it alone.
      if (path.isAbsolute(p)) return p;

      // If it's not explicitly relative, then leave it alone (i.e., it's a module).
      if (!isExplicitlyRelative(p)) return p;

      // Path must be explicitly releative, therefore make it absolute.
      return path.resolve(path.join(base, p));
    })
    .sort();
}

function isExplicitlyRelative(importPath) {
  return importPath.indexOf(".") === 0;
}
