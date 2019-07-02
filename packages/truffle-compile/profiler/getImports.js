const { isExplicitlyRelative } = require("./isExplicitlyRelative");
const Parser = require("../parser");
const path = require("path");

const getImports = (file, { body, source }, solc) => {
  // No imports in vyper!
  if (path.extname(file) === ".vy") return [];

  const imports = Parser.parseImports(body, solc);

  // Convert explicitly relative dependencies of modules back into module paths.
  return imports.map(dependencyPath =>
    isExplicitlyRelative(dependencyPath)
      ? source.resolve_dependency_path(file, dependencyPath)
      : dependencyPath
  );
};

module.exports = {
  getImports
};
