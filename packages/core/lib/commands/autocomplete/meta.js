const install = require("./commands/install");
const uninstall = require("./commands/uninstall");

module.exports = {
  command: "autocomplete",
  description: false, // Will not be displayed on help menu
  builder: function (yargs) {
    return yargs
      .command({
        ...install.run,
        ...install.meta
      })
      .demandCommand()
      .command({
        ...uninstall.run,
        ...uninstall.meta
      })
      .demandCommand();
  },
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
