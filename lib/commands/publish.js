var Config = require("truffle-config");
var Package = require("../package");

var command = {
  command: 'publish',
  description: 'Publish a package to the Ethereum Package Registry',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);
    Package.publish(config, done);
  }
}

module.exports = command;
