const install = require("./commands/install");
const uninstall = require("./commands/uninstall");

module.exports = {
  command: "completion",
  description: false, // Not intended to be used by clients
  builder: {},
  help: {
    usage: "truffle completion <command>",
    options: [],
    allowedGlobalOptions: []
  },
  commands: {
    install: install.meta,
    uninstall: uninstall.meta
  }
};
