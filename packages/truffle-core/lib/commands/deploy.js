var migrate = require("./migrate");

var command = {
  command: 'deploy',
  description: '(alias for migrate)',
  builder: migrate.builder,
  userHelp: {
    usage: "truffle deploy [--reset] [-f <number>] [--network <name>] [--compile-all] [--verbose-rpc]",
    parameters: migrate.userHelp.parameters,
  },
  run: migrate.run
}

module.exports = command;
