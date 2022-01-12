const migrate = require("../migrate");

module.exports = {
  command: "deploy",
  description: "(alias for migrate)",
  builder: migrate.builder,
  help: {
    usage:
      "truffle deploy [--reset] [-f <number>] [--compile-all] [--verbose-rpc]",
    options: migrate.meta.help.options,
    allowedGlobalOptions: ["network", "config"]
  }
};
