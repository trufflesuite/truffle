var pkg = require("./package.json");

module.exports = {
  build: require("./lib/build"),
  create: require("./lib/create"),
  config: require("./lib/config"),
  console: require("./lib/repl"),
  contracts: require("./lib/contracts"),
  init: require("./lib/init"),
  package: require("./lib/package"),
  serve: require("./lib/serve"),
  test: require("./lib/test"),
  version: pkg.version
};
