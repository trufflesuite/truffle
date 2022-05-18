module.exports = async function (options) {
  const Config = require("@truffle/config");
  const Console = require("../../console");
  const { Environment } = require("@truffle/environment");

  const config = Config.detect(options);

  const commands = require("../commands");
  const excluded = new Set(["console", "init", "watch", "develop"]);

  const consoleCommands = commands.reduce((acc, name) => {
    return !excluded.has(name)
      ? Object.assign(acc, { [name]: commands[name] })
      : acc;
  }, {});

  await Environment.detect(config);
  const c = new Console(consoleCommands, config);
  return await c.start();
};
