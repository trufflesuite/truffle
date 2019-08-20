const WHITELISTED_PLUGINS = {
  solhint: "truffle-plugin-solhint"
};

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
  run(options, done) {
    const Config = require("truffle-config");
    const Plugin = require("./plugin");
    const Run = require("./run");
    const config = Config.detect(options);

    if (options._.length === 0) {
      const help = require("../help");
      help.displayCommandHelp("run");
      return done();
    }

    const customCommand = options._[0];

    if (WHITELISTED_PLUGINS[customCommand]) {
      config.plugins.push(WHITELISTED_PLUGINS[customCommand]);
      let pluginConfig = Plugin.load(config);
      Run.run(pluginConfig, customCommand, config, done);
    } else if (config.plugins.length > 0) {
      let pluginConfigs = Plugin.load(config);
      Run.run(pluginConfigs, customCommand, config, done);
    } else {
      console.error(
        "\nError: No plugins detected in the configuration file.\n"
      );
      done();
    }
  }
};

module.exports = command;
