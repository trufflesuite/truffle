var command = {
  command: "networks",
  description: "Show addresses for deployed contracts on each network",
  builder: {
    clean: {
      describe:
        "Remove network artifacts that don't belong to any configuration",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage: "truffle networks [--clean]",
    options: [
      {
        option: "--clean",
        description:
          "Remove all network artifacts that aren't associated with a named network."
      }
    ]
  },
  run: async function (options) {
    const Config = require("@truffle/config");
    const Networks = require("../networks");

    const config = Config.detect(options);

    if (options.clean) {
      return Networks.clean(config);
    }
    return Networks.display(config);
  }
};

module.exports = command;
