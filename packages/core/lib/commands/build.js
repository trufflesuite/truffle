const command = {
  command: "build",
  description: "Execute build pipeline (if configuration present)",
  builder: {},
  help: {
    usage: "truffle build",
    options: []
  },
  run: async function(options) {
    const Config = require("@truffle/config");
    const Build = require("../build");
    const config = Config.detect(options);

    return Build.build(config);
  }
};

module.exports = command;
