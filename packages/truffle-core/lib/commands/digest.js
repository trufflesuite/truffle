var Config = require("truffle-config");
var Package = require("../package");

var command = {
  command: 'digest',
  description: 'Install a package from the Ethereum package registry',
  builder: {},
  run: function (options, done) {
    var config = Config.detect(options);
    Package.digest(config, function(err, results) {
      if (err) return done(err);
      options.logger.log(results);
      done();
    });
  }
}

module.exports = command;
