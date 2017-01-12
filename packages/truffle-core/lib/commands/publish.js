var Config = require("../config");
var Package = require("../package");

var command = {
  command: 'publish',
  description: 'Publish a package to the Ethereum package registry',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);
    Package.publish(config, done);
  }
}

module.exports = command;
