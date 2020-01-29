const isExplicitlyRelative = importPath => {
  return importPath.indexOf(".") === 0;
};

module.exports = {
  isExplicitlyRelative
};
