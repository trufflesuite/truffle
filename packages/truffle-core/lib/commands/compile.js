var command = {
  command: 'compile',
  description: 'Compile contract source files',
  builder: {
    all: {
      type: "boolean",
      default: false
    }
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var Contracts = require("../contracts");

    var config = Config.detect(options);
    Contracts.compile(config, done);
  }
}

module.exports = command;
