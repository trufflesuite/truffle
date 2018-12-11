const command = {
  command: "version",
  description: "Show version number and exit",
  builder: {},
  help: {
    usage: "truffle version",
    options: []
  },
  run: function(options, done) {
    const version = require("../version");
    const { logger } = options;
    const Config = require("truffle-config");
    const config = Config.detect(options);
    version.logAll(logger, config);
    done();
  }
};

module.exports = command;
