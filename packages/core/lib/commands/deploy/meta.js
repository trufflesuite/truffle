const migrate = require("../migrate");

module.exports = {
  command: "deploy",
  description: "(alias for migrate)",
  builder: migrate.builder,
  help: {
    usage:
      "truffle deploy [--reset] [-f <number>] [--compile-all] [--verbose-rpc] \n" +
      "                               " + // spacing to align with previous line
      "[--network <network>|--url <provider_url>]",
    options: migrate.meta.help.options,
    allowedGlobalOptions: ["config"]
  }
};
