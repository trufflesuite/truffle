const shell = require("./commands/shell");

const shellTypes = ["bash", "zsh"];

module.exports = {
  command: "autocomplete",
  description: "Outputs completion settings",
  builder: function (yargs) {
    shellTypes.forEach(type => {
      yargs
        .command({
          ...shell(type).run,
          ...shell(type).meta
        })
        .demandCommand();
    });

    return yargs;
  },
  help: {
    usage: "truffle autocomplete <shell>",
    options: [],
    allowedGlobalOptions: []
  },
  commands: Object.fromEntries(shellTypes.map(type => [type, shell(type).meta]))
};
