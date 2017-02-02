var Config = require("truffle-config");
var init = require("../init");

var command = {
  command: 'init',
  description: 'Initialize new Ethereum project with example contracts and tests',
  builder: {},
  run: function (options, done) {
    var config = Config.default();
    init(config.working_directory, done);
  }
}

module.exports = command;
