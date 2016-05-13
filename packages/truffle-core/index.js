module.exports = {
  build: require("./lib/build"),
  create: require("./lib/create"),
  compiler: require("./lib/compiler"),
  config: require("./lib/config"),
  console: require("./lib/repl"),
  contracts: require("./lib/contracts"),
  exec: require("./lib/exec"),
  init: require("./lib/init"),
  migrate: require("./lib/migrate"),
  profile: require("./lib/profiler"),
  serve: require("./lib/serve"),
  test: require("./lib/test")
};
