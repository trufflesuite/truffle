var command = {
  command: 'networks',
  description: 'Show addresses for deployed contracts on each network',
  builder: {
    clean: {
      describe: "Remove network artifacts that don't belong to any configuration",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle networks [--clean]",
    options: [
      {
        option: "--clean",
        description: "Remove all network artifacts that aren't associated with a named network.",
      }
    ]
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var Networks = require("../networks");

    var config = Config.detect(options);

    if (options.clean) {
      Networks.clean(config, done);
    } else {
      Networks.display(config, done);
    }
  }
};

module.exports = command;
