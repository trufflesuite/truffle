const migrate = require("./migrate");

const command = {
  command: "deploy",
  description: "(alias for migrate)",
  builder: migrate.builder,
  help: {
    usage:
      "truffle deploy [--reset] [-f <number>] [--network <name>] [--compile-all] [--verbose-rpc]",
    options: migrate.help.options
  },
  run: migrate.run
};

module.exports = command;
