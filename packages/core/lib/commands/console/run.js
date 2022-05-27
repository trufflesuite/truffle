module.exports = async function (options) {
  const Config = require("@truffle/config");
  const { Console, excludedCommands } = require("../../console");
  const { Environment } = require("@truffle/environment");

  const config = Config.detect(options);
  const commands = require("../commands");

  const consoleCommands = commands.reduce((acc, name) => {
    return !excludedCommands.has(name)
      ? Object.assign(acc, { [name]: commands[name] })
      : acc;
  }, {});

  await Environment.detect(config);
  const c = new Console(consoleCommands, config.with({ noAliases: true }));
  return await c.start();
};
