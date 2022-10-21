const OS = require("os");
const run = require("./commands/run");
const bash = require("./commands/shell")("bash");
const zsh = require("./commands/shell")("zsh");

const usage =
  "truffle autocomplete <sub-command> [options]" +
  OS.EOL +
  OS.EOL +
  "  Available sub-commands: " +
  OS.EOL +
  "                run \tInvoke autocompletion" +
  OS.EOL +
  "                bash \tGenerate bash completions" +
  OS.EOL +
  "                zsh \tGenerate zsh completions" +
  OS.EOL;

module.exports = {
  command: "autocomplete",
  description: "Tab-completion for bash and zsh",
  builder: function (yargs) {
    yargs
      .command({
        ...run.meta,
        ...run.run
      })
      .demandCommand();
    yargs
      .command({
        ...bash.meta,
        ...bash.run
      })
      .demandCommand();
    yargs
      .command({
        ...zsh.meta,
        ...zsh.run
      })
      .demandCommand();

    return yargs;
  },
  help: {
    usage,
    options: [],
    allowedGlobalOptions: []
  },

  subCommands: {
    run,
    bash,
    zsh
  }
};
