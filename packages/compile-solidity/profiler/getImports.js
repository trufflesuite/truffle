const { isExplicitlyRelative } = require("./isExplicitlyRelative");
const Parser = require("../parser");
const path = require("path");

const getImports = (file, { body, source }, solc, parserSolc) => {
  let imports;

  // No imports in non-sol files (yet)!
  if (path.extname(file) !== ".sol") return [];

  if (parserSolc) imports = Parser.parseImports(body, parserSolc);
  else imports = Parser.parseImports(body, solc);

  // Convert explicitly relative dependencies of modules back into module paths.
  return imports.map(
    dependencyPath =>
      isExplicitlyRelative(dependencyPath)
        ? source.resolve_dependency_path(file, dependencyPath)
        : dependencyPath
  );
};

module.exports = {
  getImports
};
