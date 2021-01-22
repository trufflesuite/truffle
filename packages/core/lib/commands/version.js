const command = {
  command: "version",
  description: "Show version number and exit",
  builder: {},
  help: {
    usage: "truffle version",
    options: []
  },
  run: async function (options) {
    const version = require("../version");
    const {logger} = options;
    const Config = require("@truffle/config");

    let config;
    try {
      config = Config.detect(options);
    } catch (error) {
      // Suppress error when truffle can't find a config
      if (error.message === "Could not find suitable configuration file.") {
        config = Config.default();
      } else {
        throw error;
      }
    }

    version.logAll(logger, config);
    return;
  }
};

module.exports = command;
