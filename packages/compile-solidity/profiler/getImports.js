const semver = require("semver");
const Common = require("@truffle/compile-common");
const Parser = require("../parser");
const path = require("path");

const getImports = (file, { body, source }, solc) => {
  // No imports in vyper!
  if (path.extname(file) === ".vy") return [];

  try {
    const imports = Parser.parseImports(body, solc);

    // Convert explicitly relative dependencies of modules back into module paths.
    return imports.map(
      dependencyPath =>
        Common.Profiler.isExplicitlyRelative(dependencyPath)
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
};

module.exports = {
  getImports
};
