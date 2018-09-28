var pkg = require("./package.json");

module.exports = {
  build: require("./lib/build"),
  create: require("./lib/create"),
  console: require("./lib/repl"),
  contracts: require("truffle-workflow-compile"),
  package: require("./lib/package"),
  test: require("./lib/test"),
  version: pkg.version
};
