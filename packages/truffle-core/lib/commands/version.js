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
    version.log(logger);
    done();
  }
};

module.exports = command;
