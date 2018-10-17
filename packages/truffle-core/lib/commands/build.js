const command = {
  command: 'build',
  description: 'Execute build pipeline (if configuration present)',
  builder: {},
    help: {
    usage: "truffle build",
    options: [],
  },
  run: function (options, done) {
    const Config = require("truffle-config");
    const Build = require("../build");
    const config = Config.detect(options);

    Build.build(config, done);
  }
}

module.exports = command;
