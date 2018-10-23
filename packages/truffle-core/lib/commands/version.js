const command = {
  command: "version",
  description: "Show version number and exit",
  builder: {},
  help: {
    usage: "truffle version",
    options: [],
  },
  run: function (options, done) {
    const { logVersionInformation } = require("../version");
    const { logger } = options;
    logVersionInformation(logger);
    done();
  }
}

module.exports = command;
