const command = {
  command: "publish",
  description: "Publish a package to the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "truffle publish",
    options: []
  },
  run: async function(options) {
    const Config = require("@truffle/config");
    const Package = require("../package");

    const config = Config.detect(options);
    return Package.publish(config);
  }
};

module.exports = command;
