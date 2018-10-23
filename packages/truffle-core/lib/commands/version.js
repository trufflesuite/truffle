const command = {
  command: "version",
  description: "Show version number and exit",
  builder: {},
  help: {
    usage: "truffle version",
    options: [],
  },
  run: function (options, done) {
    var version = require("../version");

    options.logger.log("Truffle " + version.bundle + " (core: " + version.core + ")");
    options.logger.log("Solidity v" + version.solc + " (solc-js)");

    done();
  }
}

module.exports = command;
