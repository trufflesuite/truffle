module.exports = async options => {
  const Run = require("./runHandler");
  const { promisify } = require("util");
  const Config = require("@truffle/config");
  const { checkPluginConfig } = require("./checkPluginConfig");
  const config = Config.detect(options);

  if (options._.length === 0) {
    const { displayCommandHelp } = require("../help");
    await displayCommandHelp("run");
    return;
  }

  const customCommand = options._[0];

  checkPluginConfig(config);

  return await promisify(Run.run.bind(Run))(customCommand, config);
};
