var Config = require("../config");
var Package = require("../package");

var command = {
  command: 'install',
  description: 'Show information about the current package',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);
    Package.install(config, done);
  }
}

module.exports = command;
