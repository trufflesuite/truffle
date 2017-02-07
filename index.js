var pkg = require("./package.json");

module.exports = {
  build: require("./lib/build"),
  create: require("./lib/create"),
  compiler: require("truffle-compile"),
  config: require("./lib/config"),
  console: require("./lib/repl"),
  contracts: require("./lib/contracts"),
  require: require("truffle-require"),
  init: require("./lib/init"),
  migrate: require("truffle-migrate"),
  package: require("./lib/package"),
  serve: require("./lib/serve"),
  sources: require("truffle-contract-sources"),
  test: require("./lib/test"),
  version: pkg.version
};
