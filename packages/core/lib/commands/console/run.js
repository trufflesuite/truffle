module.exports = async function (options) {
  const OS = require("os");
  const { Console, excludedCommands } = require("../../console");
  const { Environment } = require("@truffle/environment");
  const TruffleError = require("@truffle/error");
  const commands = require("../commands");
  const loadConfig = require("../../loadConfig");

  if (options.url && options.network) {
    const message =
      "" +
      "Mutually exclusive options, --url and --network detected!" +
      OS.EOL +
      "Please use either --url or --network and try again." +
      OS.EOL +
      "See: https://trufflesuite.com/docs/truffle/reference/truffle-commands/#console" +
      OS.EOL;
    throw new TruffleError(message);
  }

  let config = loadConfig(options);

  const consoleCommands = commands.reduce((acc, name) => {
    return !excludedCommands.has(name)
      ? Object.assign(acc, { [name]: commands[name] })
      : acc;
  }, {});

  await Environment.detect(config);
  const c = new Console(consoleCommands, config.with({ noAliases: true }));
  return await c.start();
};
