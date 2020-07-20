const { error } = require("@truffle/contract/lib/handlers");

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
    const { promisify } = require("util");
    const Config = require("@truffle/config");
    const { checkPluginConfig } = require("./checkPluginConfig");
    const Run = require("./run");
    const config = Config.detect(options);

    if (options._.length === 0) {
      const help = require("../help");
      help.displayCommandHelp("run");
      return;
    }

    const customCommand = options._[0];

    try {
      checkPluginConfig(config);
    } catch (err) {
      console.error(err);
      return;
    }

    return await promisify(Run.run.bind(Run))(customCommand, config);
    Run.run(customCommand, config, done);
  }
};

module.exports = command;
