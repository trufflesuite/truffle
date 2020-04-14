const Common = require("@truffle/compile-common");
const Parser = require("../parser");
const path = require("path");

const getImports = (file, { body, source }, solc) => {
  // No imports in vyper!
  if (path.extname(file) === ".vy") return [];

  const imports = Parser.parseImports(body, solc);

  // Convert explicitly relative dependencies of modules back into module paths.
  return imports.map(
    dependencyPath =>
      Common.Profiler.isExplicitlyRelative(dependencyPath)
        ? source.resolveDependencyPath(file, dependencyPath)
        : dependencyPath
  );
};

module.exports = {
  getImports
};
