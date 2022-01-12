module.exports = async function (options) {
  const Config = require("@truffle/config");
  const Console = require("../../console");
  const { Environment } = require("@truffle/environment");

  const config = Config.detect(options);

  const commands = require("../index");
  const excluded = new Set(["console", "init", "watch", "develop"]);

  const consoleCommands = Object.keys(commands).reduce((acc, name) => {
    return !excluded.has(name)
      ? Object.assign(acc, { [name]: commands[name] })
      : acc;
  }, {});

  await Environment.detect(config);
  const c = new Console(consoleCommands, config.with({ noAliases: true }));
  return await c.start();
};
