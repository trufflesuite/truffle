var pkg = require("./package.json");

module.exports = {
  build: require("./lib/build"),
  create: require("./lib/create"),
  compiler: require("./lib/compiler"),
  config: require("./lib/config"),
  console: require("./lib/repl"),
  contracts: require("./lib/contracts"),
  require: require("./lib/require"),
  init: require("./lib/init"),
  migrate: require("./lib/migrate"),
  profile: require("./lib/profiler"),
  serve: require("./lib/serve"),
  test: require("./lib/test"),
  version: pkg.version
};
