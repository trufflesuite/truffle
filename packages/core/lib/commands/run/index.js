const command = {
  command: "run",
  description: "Run a third-party command",
  builder: {},
  help: {
    usage: "truffle run [<command>]",
    options: [
      {
        option: "<command>",
        description: "Name of the third-party command to run."
      }
    ]
  },
  async run(options) {
    const {promisify} = require("util");
    const Config = require("@truffle/config");
    const Plugin = require("./plugin");
    const Run = require("./run");
    const config = Config.detect(options);

    if (options._.length === 0) {
      const help = require("../help");
      help.displayCommandHelp("run");
      return;
    }

    const customCommand = options._[0];

    if (config.plugins) {
      let pluginConfigs = Plugin.load(config);
      return await promisify(Run.run).bind(Run)(pluginConfigs, customCommand, config);
    } else {
      console.error(
        "\nError: No plugins detected in the configuration file.\n"
      );
      return;
    }
  }
};

module.exports = command;
