var Config = require("../config");
var Build = require("../build");

var command = {
  command: 'build',
  description: 'Execute build pipeline (if present)',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);
    Build.build(config, done);
  }
}

module.exports = command;
