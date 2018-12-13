const command = {
  command: "version",
  description: "Show version number and exit",
  builder: {},
  help: {
    usage: "truffle version",
    options: []
  },
  run: function(options, done) {
    let config;
    const version = require("../version");
    const { logger } = options;
    const Config = require("truffle-config");

    try {
      config = Config.detect(options);
    } catch (error) {
      // Suppress error when truffle can't find a config
      if (error.message === "Could not find suitable configuration file.") {
        config = null;
      } else {
        return done(error);
      }
    }

    version.logAll(logger, config);
    done();
  }
};

module.exports = command;
