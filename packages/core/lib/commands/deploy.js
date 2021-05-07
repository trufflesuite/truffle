const migrate = require("./migrate");

const command = {
  command: "deploy",
  description: "(alias for migrate)",
  builder: migrate.builder,
  help: {
    usage:
      "truffle deploy [--reset] [-f <number>] [--compile-all] [--verbose-rpc]",
    options: migrate.help.options,
    allowedGlobalOptions: ["--network <name>", "--config <file>"]
  },
  run: migrate.run
};

module.exports = command;
