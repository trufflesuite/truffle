const install = require("./commands/install");
const uninstall = require("./commands/uninstall");

module.exports = {
  command: "autocomplete",
  description: false, // Not intended to be used by clients
  builder: {},
  help: {
    usage: "truffle autocomplete <command>",
    options: [],
    allowedGlobalOptions: []
  },
  commands: {
    install: install.meta,
    uninstall: uninstall.meta
  }
};
