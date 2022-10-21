const TruffleError = require("@truffle/error");

const bashCommand = require("./commands/shell")("bash");
const zshCommand = require("./commands/shell")("zsh");
const runCommand = require("./commands/run");

module.exports = async function (args) {
  const [subCommand] = args._;
  switch (subCommand) {
    case "run": {
      return await runCommand.run(args);
    }

    // supported shells
    case "zsh": {
      return zshCommand.run(args);
    }
    case "bash": {
      return await bashCommand.run(args);
    }

    default: {
      throw new TruffleError(
        `Unknown \`truffle autocomplete\` subcommand: ${subCommand}`
      );
    }
  }
};
