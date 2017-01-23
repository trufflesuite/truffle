var Config = require("truffle-config");
var Package = require("../package");

var command = {
  command: 'install',
  description: 'Install a package from the Ethereum Package Registry',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);
    Package.install(config, done);
  }
}

module.exports = command;
